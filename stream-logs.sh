#!/bin/bash
# ------------------------------------------------------------------
# This script directly tails the latest log file on your Hostinger
# server so you can stream them natively to your PC in real-time.
# ------------------------------------------------------------------

SERVER_IP="145.79.210.77"
SSH_PORT="65002"
USER="u914595671"
PROJECT_DIR="domains/slateblue-wildcat-506487.hostingersite.com/nodejs"

# Note: The password should ideally be set via environment variable for security
export SSHPASS="Splitedas@369"

echo "📡 Connecting to Hostinger Server to stream logs in real-time..."
echo "Press Ctrl+C to stop the stream."
echo ""

# Ensure the logs directory exists, then tail the most recent file matching 'server-*.log'
sshpass -e ssh -p $SSH_PORT $USER@$SERVER_IP \
  "mkdir -p $PROJECT_DIR/logs && cd $PROJECT_DIR/logs && ls -t server-*.log 2>/dev/null | head -n 1 | xargs -I {} tail -f {}"
