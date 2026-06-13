#!/bin/bash

# Musync Auto-Installer for macOS and Linux
# This script detects your OS, downloads the correct standalone binary from GitHub Releases,
# and installs it globally so you can just type 'musync'.

set -e

echo "Installing Musync..."

# Detect OS and Architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

BINARY_URL=""
REPO="Saarthak1234/musync"
TAG=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$TAG" ]; then
  TAG="v1.0.8"
fi

echo "  -> Detected OS: $OS"
echo "  -> Detected Arch: $ARCH"

echo "  -> Installing system dependencies (ffmpeg, yt-dlp)..."
if [ "$OS" = "Darwin" ]; then
  if command -v brew >/dev/null 2>&1; then
    brew install ffmpeg yt-dlp || true
  else
    echo "  [Warning] Homebrew not found. Please install ffmpeg and yt-dlp manually."
  fi
  if [ "$ARCH" = "arm64" ]; then
    BINARY_URL="https://github.com/$REPO/releases/download/$TAG/musync-mac-arm"
  else
    BINARY_URL="https://github.com/$REPO/releases/download/$TAG/musync-mac-intel"
  fi
elif [ "$OS" = "Linux" ]; then
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update && sudo apt-get install -y ffmpeg python3-pip
    sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
    sudo chmod a+rx /usr/local/bin/yt-dlp
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y ffmpeg python3-pip
    sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
    sudo chmod a+rx /usr/local/bin/yt-dlp
  else
    echo "  [Warning] Package manager not found. Please install ffmpeg and yt-dlp manually."
  fi
  BINARY_URL="https://github.com/$REPO/releases/download/$TAG/musync-linux"
else
  echo "[Error] Unsupported OS for auto-install: $OS"
  echo "Please download the binary manually from GitHub."
  exit 1
fi

echo "  -> Downloading Musync from $BINARY_URL..."

# Download the file to a temporary location
curl -L -o /tmp/musync $BINARY_URL

# Make it executable
chmod +x /tmp/musync

echo "  -> Installing to /usr/local/bin (may require sudo password)..."
# Move to a directory in PATH
sudo mv /tmp/musync /usr/local/bin/musync

echo "[Success] Musync installed successfully!"
echo "You can now run 'musync' from anywhere."
