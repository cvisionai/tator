// Generate a color pallette

// Convience class to RGB values for some common colors.
const color =
{
    BLACK: [0,0,0],
    WHITE: [255,255,255],
    RED: [255,0,0],
    LIME: [0,255,0],
    BLUE: [0,0,255],
    YELLOW: [255,255,0],
    CYAN: [0,255,255],
    MAGENTA: [255,0,255],
    GREEN: [0,255,0],
    TEAL: [64,224,208],

    blend : function(destColor, color, percent)
    {
	var blender = [(destColor[0]-color[0])*percent,
		      (destColor[1]-color[1])*percent,
		      (destColor[2]-color[2])*percent];
	return [color[0]+blender[0],
		color[1]+blender[1],
		color[2]+blender[2]];
    },

    // Source: https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
    hexToRgb : function (hex)
    {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	rgb=result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
	} : null;
	if (rgb)
	{
	    l=Array(3)
	    l[0]=rgb.r;
	    l[1]=rgb.g;
	    l[2]=rgb.b;
	    return l;
	}
	else
	{
	    return null;
	}
    },

    rgbToHex: function(rgb)
    {
	function componentToHex(c)
	{
	    var hex = c.toString(16);
	    return hex.length == 1 ? "0" + hex : hex;
	}
	return "#" + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);
    },

    // Given a previous color calculate an orthongal color
    nextColor : function(rgb)
    {
	// Return 1st color progression if starting at for null
	if (rgb == null)
	{
	    rgb = [0,0,255];
	}
	var hsv = this.rgbToHsv(rgb);

        var hueInc = 0.150;
        var satInc = 0.200;
        var valInc = 0.200;

        hsv[0] += hueInc;
        hsv[1] += satInc;
        hsv[2] += valInc;
        
        
        if (hsv[0] > 1)
        {
            hsv[0] -= 1;
        }

        if (hsv[1] > 1)
        {
            hsv[1] -= 0.5;
        }

        if (hsv[2] > 1)
        {
            hsv[2] -= 0.5;
        }
        
        newColor = this.hsvToRgb(hsv);

        for (var idx = 0; idx < 3; idx++)
        {
            newColor[idx] = Math.round(newColor[idx]);
        }
	return newColor;
    },

    rgbToHsv : function(rgb) {
        var r = rgb[0];
        var g = rgb[1];
        var b = rgb[2];
        r /= 255, g /= 255, b /= 255;

        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, v = max;

        var d = max - min;
        s = max == 0 ? 0 : d / max;

        if (max == min) {
            h = 0; // achromatic
        } else {
            switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
            }

            h /= 6;
        }

        return [ h, s, v ];
    },

    hsvToRgb: function (hsv) {
        var h = hsv[0];
        var s = hsv[1];
        var v = hsv[2];

        var r, g, b;

        var i = Math.floor(h * 6);
        var f = h * 6 - i;
        var p = v * (1 - s);
        var q = v * (1 - f * s);
        var t = v * (1 - (1 - f) * s);

        switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
        }

        return [ r * 255, g * 255, b * 255 ];
    }
};
