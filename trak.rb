cask "trak" do
  version "1.1.16"
  sha256 "24c7b971e730a85831e24df3467ee3332167c061d17d239d998917f1c8c26d6f"

  url "https://github.com/Saarthak1234/muStream/releases/download/v#{version}/Trak-#{version}-arm64.dmg"
  name "Trak"
  desc "A beautiful Electron Desktop application to stream your Spotify playlists completely free"
  homepage "https://github.com/Saarthak1234/muStream"

  app "Trak.app"

  zap trash: [
    "~/Library/Application Support/Trak",
    "~/Library/Preferences/com.trak.desktop.plist",
    "~/Library/Saved Application State/com.trak.desktop.savedState"
  ]
end
