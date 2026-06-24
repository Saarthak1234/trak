from PIL import Image, ImageDraw

def create_tray_icon(size, filename):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw circle outline
    pad = 2
    draw.ellipse((pad, pad, size-pad, size-pad), outline=(0, 0, 0, 255), width=2 if size > 30 else 1)
    
    # Draw play triangle
    if size > 30:
        poly = [(16, 12), (32, 22), (16, 32)]
    else:
        poly = [(8, 6), (16, 11), (8, 16)]
        
    draw.polygon(poly, fill=(0, 0, 0, 255))
    
    img.save(filename)

create_tray_icon(22, 'trayTemplate.png')
create_tray_icon(44, 'trayTemplate@2x.png')
