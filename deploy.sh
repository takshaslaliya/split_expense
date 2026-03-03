#!/bin/bash

# Exit on any failure
set -e

echo "🚀 Starting deployment to Hostinger..."

# Variables
SERVER_USER="u914595671"
SERVER_IP="145.79.210.77"
SERVER_PORT="65002"
REMOTE_DIR="domains/slateblue-wildcat-506487.hostingersite.com/nodejs"

# Note: The password should be set via environment variable for security,
# e.g., SSHPASS='your_password' ./deploy.sh
# For convenience based on your request, we are using the inline method here.
export SSHPASS="Splitedas@369"

echo "📂 Syncing files to server via Rsync..."
# Use rsync to only copy changed files, ignoring local node_modules, git, and sessions
sshpass -e rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'wa_sessions' --exclude 'logs' --exclude 'deploy.sh' \
  -e "ssh -o StrictHostKeyChecking=no -p $SERVER_PORT" ./ \
  $SERVER_USER@$SERVER_IP:$REMOTE_DIR/

echo "📦 Installing Node dependencies on the remote server..."
sshpass -e ssh -o StrictHostKeyChecking=no -p $SERVER_PORT $SERVER_USER@$SERVER_IP "cd $REMOTE_DIR && /opt/alt/alt-nodejs20/root/usr/bin/npm install --production"

echo "🔄 Restarting the Passenger Node.js app..."
sshpass -e ssh -o StrictHostKeyChecking=no -p $SERVER_PORT $SERVER_USER@$SERVER_IP "mkdir -p $REMOTE_DIR/tmp && touch $REMOTE_DIR/tmp/restart.txt"

echo "✅ Deployment complete! Your app is now live at https://slateblue-wildcat-506487.hostingersite.com"
