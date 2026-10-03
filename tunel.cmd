@echo off
rem Abre o app no Expo Go de qualquer lugar, sem login no Expo. Ver scripts\tunel.ps1.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\tunel.ps1" %*
