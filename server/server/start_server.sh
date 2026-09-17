#!/bin/bash
set -a
[ -f .env ] && . .env
set +a
node server.js
