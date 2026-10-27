"""Bundle index.html, css/ and js/ into one self-contained hollywood-dynasty.html."""
import os
import re

html = open('index.html').read()
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + open('css/style.css').read() + '</style>')

def inline(m):
    src = open(m.group(1)).read()
    # a literal closing script tag would end the inline <script> early; write it as <\/script> in JS
    assert '</script' not in src.lower(), m.group(1) + ' contains a closing script tag'
    return '<script>\n' + src + '</script>'


html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
open('hollywood-dynasty.html', 'w').write(html)


# The claude.ai artifact version: the hosting adds its own doctype/head/body skeleton,
# so the page starts at its <title> and <style>.
art = html
for tag in ['<!doctype html>', '<html lang="en">', '<head>', '<meta charset="utf-8">',
            '<meta name="viewport" content="width=device-width, initial-scale=1">', '</head>', '<body>', '</body>', '</html>']:
    assert tag in art, tag
    art = art.replace(tag, '', 1)
os.makedirs('dist', exist_ok=True)
open('dist/artifact.html', 'w').write(art.strip() + '\n')
