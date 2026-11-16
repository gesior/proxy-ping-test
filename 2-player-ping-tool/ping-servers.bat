@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

:: ============================================================================
:: Proxy Ping Test - Player Tool (Windows Batch)
:: ============================================================================
:: This script is 100%% transparent and safe to inspect in Notepad:
:: - Uses ONLY the built-in Windows "ping" command.
:: - Does NOT download files, upload anything, or modify the registry/system.
:: - Saves results locally to "my-pings.json" next to this script
::   and copies them to your clipboard (Ctrl+V on the website).
:: ============================================================================

set "PING_COUNT=20"
set "PING_TIMEOUT_MS=1500"
set "OUT_FILE=%~dp0my-pings.json"
set "SERVERS_FILE=%~dp0servers.txt"
set "NO_PAUSE=0"
set "NO_CLIP=0"

:parse_args
if "%~1"=="" goto :args_done
if /I "%~1"=="--no-pause" (
    set "NO_PAUSE=1"
    shift
    goto :parse_args
)
if /I "%~1"=="--no-clip" (
    set "NO_CLIP=1"
    shift
    goto :parse_args
)
if exist "%~1" (
    set "SERVERS_FILE=%~1"
)
shift
goto :parse_args
:args_done

set /a "TOTAL=0"

if exist "%SERVERS_FILE%" (
    call :load_from_file "%SERVERS_FILE%"
)
if %TOTAL% equ 0 (
    call :load_embedded_servers
)

if %TOTAL% equ 0 (
    echo [ERROR] No servers to test. Please populate servers.txt.
    if "%NO_PAUSE%"=="0" pause
    exit /b 1
)

echo ============================================================================
echo   Server Ping Test (%TOTAL% servers, %PING_COUNT% packets per server)
echo   Please wait - do not close this window until the test finishes...
echo ============================================================================
echo.

set "TMP_JSON=%OUT_FILE%.tmp"
> "%TMP_JSON%" (
    echo {
    echo   "schemaVersion": 1,
    echo   "type": "player-pings",
    echo   "tool": "ping-servers.bat",
    echo   "pings": {
)

for /L %%I in (1,1,%TOTAL%) do (
    set "cur_country=!srv_country[%%I]!"
    set "cur_dc=!srv_dc[%%I]!"
    set "cur_ip=!srv_ip[%%I]!"

    call :ping_one "!cur_ip!"

    if defined p_avg (
        echo [%%I/%TOTAL%] !cur_country! - !cur_dc! ^(!cur_ip!^) -^> !p_avg! ms ^(min: !p_min!, max: !p_max!, loss: !p_loss!%%^)
        set "json_avg=!p_avg!"
        set "json_min=!p_min!"
        set "json_max=!p_max!"
    ) else (
        echo [%%I/%TOTAL%] !cur_country! - !cur_dc! ^(!cur_ip!^) -^> TIMEOUT / NO REPLY ^(loss: !p_loss!%%^)
        set "json_avg=null"
        set "json_min=null"
        set "json_max=null"
    )

    set "comma=,"
    if %%I equ %TOTAL% set "comma="

    call :json_escape "!cur_ip!" esc_ip
    >> "%TMP_JSON%" (
        echo     "!esc_ip!": { "avg": !json_avg!, "min": !json_min!, "max": !json_max!, "loss": !p_loss! }!comma!
    )
)

>> "%TMP_JSON%" (
    echo   }
    echo }
)

move /y "%TMP_JSON%" "%OUT_FILE%" >nul

echo.
echo ============================================================================
echo   FINISHED
echo   Results saved to:
echo   %OUT_FILE%
echo.
if "%NO_CLIP%"=="0" (
    where clip >nul 2>&1
    if !errorlevel! equ 0 (
        clip < "%OUT_FILE%"
        echo   Results have been automatically COPIED TO CLIPBOARD ^(Ctrl+V^).
        echo   Open the website now and paste them into "Your ping to servers".
    ) else (
        echo   Open my-pings.json in Notepad, copy all text, and paste it on the website.
    )
) else (
    echo   Skipped copying to clipboard ^(--no-clip^).
)
echo ============================================================================
echo.

if "%NO_PAUSE%"=="0" pause
exit /b 0


:: ----------------------------------------------------------------------------
:: Load server list from servers.txt (country,datacenter,IP)
:: ----------------------------------------------------------------------------
:load_from_file
set "f_path=%~1"
for /f "usebackq eol=# tokens=1,2,3 delims=," %%A in ("%f_path%") do (
    set "col1=%%~A"
    set "col2=%%~B"
    set "col3=%%~C"
    call :trim col1
    call :trim col2
    call :trim col3
    if defined col3 (
        set "first_ch=!col1:~0,1!"
        set "second_ch=!col1:~1,1!"
        if not "!first_ch!"==";" if not "!first_ch!"=="#" if not "!second_ch!"=="#" (
            if /I not "!col3!"=="ip" if /I not "!col3!"=="ip address" if /I not "!col3!"=="adres ip" (
                call :add_server "!col1!" "!col2!" "!col3!"
            )
        )
    )
)
goto :eof


:: ----------------------------------------------------------------------------
:: Embedded fallback server list (updated by collect_pings.py)
:: ----------------------------------------------------------------------------
:load_embedded_servers
:: === EMBEDDED_SERVERS_START ===
call :add_server "OVH" "Canada" "158.69.209.112"
call :add_server "Oracle" "Germany" "141.144.226.122"
call :add_server "Hetzner" "Germany" "195.201.151.197"
call :add_server "OVH" "Germany" "57.129.112.208"
call :add_server "OVH" "France" "51.178.27.242"
call :add_server "OVH" "Poland" "54.37.128.135"
call :add_server "OVH" "United Kingdom" "57.129.154.151"
call :add_server "OVH" "US-East" "51.81.87.10"
call :add_server "BR-digital" "Brazil" "201.16.9.3"
call :add_server "AWS" "Brazil (DynamoDB)" "35.71.106.131"
call :add_server "AWS" "Brazil (S3)" "3.5.232.31"
call :add_server "GCP" "Brazil (Storage REP)" "34.1.97.34"
call :add_server "GCP" "Brazil (Compute REP)" "34.190.238.132"
call :add_server "Azure" "Brazil (ACR)" "191.234.139.23"
call :add_server "Azure" "Brazil (SQL)" "191.234.142.160"
call :add_server "Oracle" "Brazil (SaoPaulo)" "134.70.84.3"
call :add_server "Oracle" "Brazil (Vinhedo)" "134.70.140.1"
call :add_server "Vultr" "Brazil (SaoPaulo)" "216.238.98.118"
call :add_server "DataPacket" "Brazil (Equinix SP4)" "138.199.4.1"
:: === EMBEDDED_SERVERS_END ===
goto :eof


:add_server
set "a_country=%~1"
set "a_dc=%~2"
set "a_ip=%~3"
if not defined a_ip goto :eof
set /a "TOTAL+=1"
set "srv_country[%TOTAL%]=%a_country%"
set "srv_dc[%TOTAL%]=%a_dc%"
set "srv_ip[%TOTAL%]=%a_ip%"
goto :eof


:: ----------------------------------------------------------------------------
:: Run ping and parse output independently of Windows display language
:: ----------------------------------------------------------------------------
:ping_one
set "TARGET_IP=%~1"
set "p_sent="
set "p_lost="
set "p_loss=100"
set "p_min="
set "p_max="
set "p_avg="
set "in_stats=0"

:: One warmup packet to avoid first-packet ARP/NAT/conntrack cold-start spike
ping -n 3 -w 600 %TARGET_IP% >nul 2>&1

for /f "usebackq delims=" %%L in (`ping -n %PING_COUNT% -w %PING_TIMEOUT_MS% %TARGET_IP% 2^>nul`) do (
    set "line=%%L"
    if not "!line:(=!"=="!line!" (
        for /f "tokens=1,2,3,4 delims==" %%a in ("!line!") do (
            if not "%%d"=="" (
                set "in_stats=1"
                call :extract_int "%%b" p_sent
                for /f "tokens=1 delims=(" %%P in ("%%d") do call :extract_int "%%P" p_lost
                if defined p_sent if not "!p_sent!"=="0" if defined p_lost (
                    set /a "p_loss=(p_lost * 100) / p_sent"
                )
            )
        )
    ) else if "!in_stats!"=="1" (
        for /f "tokens=1,2,3,4 delims==" %%a in ("!line!") do (
            if not "%%d"=="" (
                call :extract_int "%%b" p_min
                call :extract_int "%%c" p_max
                call :extract_int "%%d" p_avg
            )
        )
    )
)
goto :eof


:: ----------------------------------------------------------------------------
:: Text helper subroutines
:: ----------------------------------------------------------------------------
:extract_int
set "raw=%~1"
set "digits="
set "started=0"
:ei_loop
if not defined raw goto :ei_done
set "ch=!raw:~0,1!"
set "raw=!raw:~1!"
if "!ch!"==" " if "!started!"=="0" goto :ei_loop
if "!ch!"=="<" if "!started!"=="0" goto :ei_loop
set "is_digit=0"
for %%D in (0 1 2 3 4 5 6 7 8 9) do if "!ch!"=="%%D" set "is_digit=1"
if "!is_digit!"=="1" (
    set "started=1"
    set "digits=!digits!!ch!"
    goto :ei_loop
)
:ei_done
set "%~2=!digits!"
goto :eof


:trim
set "t_val=!%~1!"
:trim_l
if not defined t_val goto :trim_r
if "!t_val:~0,1!"==" " (
    set "t_val=!t_val:~1!"
    goto :trim_l
)
:trim_r
if not defined t_val goto :trim_done
if "!t_val:~-1!"==" " (
    set "t_val=!t_val:~0,-1!"
    goto :trim_r
)
:trim_done
set "%~1=!t_val!"
goto :eof


:json_escape
set "j_val=%~1"
set "j_val=!j_val:\=\\!"
set "j_val=!j_val:"=\"!"
set "%~2=!j_val!"
goto :eof
