<#
.SYNOPSIS
Windows PowerShell equivalent of the project Makefile.
#>
param (
    [string]$Target = "help"
)

# Ensure Go bin directory is in the path for this session
$GoBinPath = "$env:USERPROFILE\go\bin"
if ($env:PATH -notmatch [regex]::Escape($GoBinPath)) {
    $env:PATH += ";$GoBinPath"
}

# Variables
$PROTO_DIR = "proto"
$GEN_CLIENT_DIR = "src\generated\client"
$GEN_SERVER_DIR = "src\generated\server"
$DOCS_API_DIR = "docs\api"

# Go install settings
$env:GOPROXY = "direct"
$env:GOPRIVATE = "github.com/SebastienMelki"

# Required tool versions
$BUF_VERSION = "v1.64.0"
$SEBUF_VERSION = "v0.7.0"

function Invoke-GoInstall($Package) {
    Write-Host "Running: go install $Package" -ForegroundColor Cyan
    go install $Package
}

switch ($Target) {
    "help" {
        Write-Host "Usage: .\make.ps1 [target]`n"
        Write-Host "Targets:"
        Write-Host "  install               Install everything (buf, sebuf plugins, npm deps, proto deps, browsers)"
        Write-Host "  install-buf           Install buf CLI"
        Write-Host "  install-plugins       Install sebuf protoc plugins (requires Go)"
        Write-Host "  install-npm           Install npm dependencies"
        Write-Host "  install-playwright    Install Playwright browsers for e2e tests"
        Write-Host "  deps                  Install/update buf proto dependencies"
        Write-Host "  lint                  Lint protobuf files"
        Write-Host "  generate              Generate code from proto definitions"
        Write-Host "  breaking              Check for breaking changes against main"
        Write-Host "  format                Format protobuf files"
        Write-Host "  check                 Run all checks (lint + generate)"
        Write-Host "  clean                 Clean generated files"
    }

    "install" {
        .\make.ps1 install-buf
        .\make.ps1 install-plugins
        .\make.ps1 install-npm
        .\make.ps1 install-playwright
        .\make.ps1 deps
    }

    "install-buf" {
        if (Get-Command "buf" -ErrorAction SilentlyContinue) {
            $bufVer = (buf --version).Trim()
            Write-Host "buf already installed: $bufVer" -ForegroundColor Green
        } else {
            Write-Host "Installing buf..." -ForegroundColor Cyan
            Invoke-GoInstall "github.com/bufbuild/buf/cmd/buf@$BUF_VERSION"
            Write-Host "buf installed!" -ForegroundColor Green
        }
    }

    "install-plugins" {
        Write-Host "Installing sebuf protoc plugins $SEBUF_VERSION..." -ForegroundColor Cyan
        Invoke-GoInstall "github.com/SebastienMelki/sebuf/cmd/protoc-gen-ts-client@$SEBUF_VERSION"
        Invoke-GoInstall "github.com/SebastienMelki/sebuf/cmd/protoc-gen-ts-server@$SEBUF_VERSION"
        Invoke-GoInstall "github.com/SebastienMelki/sebuf/cmd/protoc-gen-openapiv3@$SEBUF_VERSION"
        Write-Host "Plugins installed!" -ForegroundColor Green
    }

    "install-npm" {
        Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
        npm install
    }

    "install-playwright" {
        Write-Host "Installing Playwright browsers..." -ForegroundColor Cyan
        npx playwright install chromium
    }

    "deps" {
        Write-Host "Updating buf proto dependencies..." -ForegroundColor Cyan
        Set-Location $PROTO_DIR
        buf dep update
        Set-Location ..
    }

    "lint" {
        Write-Host "Linting protobuf files..." -ForegroundColor Cyan
        Set-Location $PROTO_DIR
        buf lint
        Set-Location ..
    }

    "generate" {
        .\make.ps1 clean
        $null = New-Item -ItemType Directory -Force -Path $GEN_CLIENT_DIR, $GEN_SERVER_DIR, $DOCS_API_DIR
        
        Set-Location $PROTO_DIR
        buf generate
        Set-Location ..
        
        Write-Host "Code generation complete!" -ForegroundColor Green
    }

    "breaking" {
        Write-Host "Checking for breaking changes..." -ForegroundColor Cyan
        Set-Location $PROTO_DIR
        buf breaking --against '.git#branch=main,subdir=proto'
        Set-Location ..
    }

    "format" {
        Write-Host "Formatting protobuf files..." -ForegroundColor Cyan
        Set-Location $PROTO_DIR
        buf format -w
        Set-Location ..
    }

    "check" {
        .\make.ps1 lint
        .\make.ps1 generate
    }

    "clean" {
        if (Test-Path $GEN_CLIENT_DIR) { Remove-Item -Recurse -Force $GEN_CLIENT_DIR }
        if (Test-Path $GEN_SERVER_DIR) { Remove-Item -Recurse -Force $GEN_SERVER_DIR }
        if (Test-Path $DOCS_API_DIR)   { Remove-Item -Recurse -Force $DOCS_API_DIR }
        Write-Host "Clean complete!" -ForegroundColor Green
    }

    default {
        Write-Host "Unknown target: $Target" -ForegroundColor Red
        .\make.ps1 help
    }
}