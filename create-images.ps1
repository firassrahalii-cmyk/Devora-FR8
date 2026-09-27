Add-Type -AssemblyName System.Drawing

$imagesDir = "C:\Users\Rahal\OneDrive\Desktop\devora\images"

# M4 Icon (128x128)
$b = New-Object System.Drawing.Bitmap(128,128)
$g = [System.Drawing.Graphics]::FromImage($b)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(15,20,35))
$br1 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(35,35,40))
$br2 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(25,25,30))
$br3 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(45,45,50))
$g.FillRectangle($br1,10,50,30,24)
$g.FillRectangle($br1,40,46,44,16)
$g.FillRectangle($br2,84,50,32,10)
$g.FillRectangle($br1,50,62,14,26)
$g.FillRectangle($br1,58,66,10,18)
$g.FillRectangle($br3,44,40,20,6)
$g.FillRectangle($br3,44,36,12,4)
$g.Dispose()
$b.Save("$imagesDir\weapon-m4.png", [System.Drawing.Imaging.ImageFormat]::Png)
$b.Dispose()
Write-Output "M4 created"

# Glock Icon (128x128)
$b = New-Object System.Drawing.Bitmap(128,128)
$g = [System.Drawing.Graphics]::FromImage($b)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(15,20,35))
$sl = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(150,150,160))
$fr = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(35,35,40))
$dk = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(25,25,30))
$g.FillRectangle($sl,20,42,72,16)
$g.FillRectangle($fr,20,58,52,20)
$g.FillRectangle($fr,60,62,24,26)
$g.FillRectangle($dk,92,46,16,10)
$g.FillRectangle($fr,30,74,14,12)
$g.Dispose()
$b.Save("$imagesDir\weapon-glock.png", [System.Drawing.Imaging.ImageFormat]::Png)
$b.Dispose()
Write-Output "Glock created"

# Knife Icon (128x128)
$b = New-Object System.Drawing.Bitmap(128,128)
$g = [System.Drawing.Graphics]::FromImage($b)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(15,20,35))
$sv = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(170,170,180))
$gd = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(100,100,105))
$hd = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(80,55,35))
$pts = @([System.Drawing.Point]::new(50,10),[System.Drawing.Point]::new(62,68),[System.Drawing.Point]::new(38,68))
$g.FillPolygon($sv,$pts)
$g.FillRectangle($gd,34,68,32,8)
$g.FillRectangle($hd,38,76,24,34)
$g.Dispose()
$b.Save("$imagesDir\weapon-knife.png", [System.Drawing.Imaging.ImageFormat]::Png)
$b.Dispose()
Write-Output "Knife created"

# Grenade Icon (128x128)
$b = New-Object System.Drawing.Bitmap(128,128)
$g = [System.Drawing.Graphics]::FromImage($b)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(15,20,35))
$gn = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(80,110,55))
$ln = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(55,78,38))
$mt = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(110,110,115))
$g.FillEllipse($gn,28,30,72,72)
for($i=0;$i-lt5;$i++){$g.FillRectangle($ln,36,38+$i*12,56,3)}
for($i=0;$i-lt4;$i++){$g.FillRectangle($ln,36+$i*14,38,3,60)}
$g.FillRectangle($mt,52,18,22,14)
$g.FillRectangle($mt,56,10,14,10)
$g.FillEllipse($mt,60,4,8,8)
$g.Dispose()
$b.Save("$imagesDir\weapon-grenade.png", [System.Drawing.Imaging.ImageFormat]::Png)
$b.Dispose()
Write-Output "Grenade created"

# Hands with Glock (640x300)
$b = New-Object System.Drawing.Bitmap(640,300)
$g = [System.Drawing.Graphics]::FromImage($b)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(30,38,25))
$gl = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(30,30,35))
$sl = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(150,150,160))
$dk = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(25,25,30))

# Left hand/glove
$g.FillRectangle($gl,160,110,130,180)
$g.FillEllipse($gl,140,90,60,50)
$g.FillRectangle($gl,175,80,22,45)
$g.FillRectangle($gl,200,75,22,50)
$g.FillRectangle($gl,225,78,22,47)
$g.FillRectangle($gl,250,82,20,43)
$g.FillRectangle($gl,272,88,16,38)

# Right hand/glove
$g.FillRectangle($gl,350,110,130,180)
$g.FillEllipse($gl,440,90,60,50)
$g.FillRectangle($gl,365,80,22,45)
$g.FillRectangle($gl,390,75,22,50)
$g.FillRectangle($gl,415,78,22,47)
$g.FillRectangle($gl,440,82,20,43)
$g.FillRectangle($gl,462,88,16,38)

# Glock in hands
$g.FillRectangle($sl,210,38,200,30)
$g.FillRectangle($dk,220,28,140,12)
$g.FillRectangle($sl,410,42,20,22)
$g.FillRectangle($dk,210,68,160,14)
$g.FillRectangle($dk,260,82,50,30)
$g.FillRectangle($dk,230,82,30,20)

$g.Dispose()
$b.Save("$imagesDir\hands-glock.png", [System.Drawing.Imaging.ImageFormat]::Png)
$b.Dispose()
Write-Output "Hands created"
Write-Output "All images created!"