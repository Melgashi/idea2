"""Bundle index.html, css/ and js/ into one self-contained hollywood-dynasty.html."""
import re

html = open('index.html').read()
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + open('css/style.css').read() + '</style>')
html = re.sub(r'<script src="([^"]+)"></script>', lambda m: '<script>\n' + open(m.group(1)).read() + '</script>', html)
open('hollywood-dynasty.html', 'w').write(html)
