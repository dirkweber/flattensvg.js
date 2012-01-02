# flattensvg.js: "flatten" SVGs. Fix SVGs in background images in webkit.
----------

flattensvg.js fixes a webkit bug with SVGs in stylesheets. Webkit currently is not able to display externally referenced images within SVGs that are used as background images. fixsvg.js fixes this by parsing a stylesheet, looking for references to SVG background images, then parsing every SVG for stylesheets and images. It then replaces references to stylesheets with inline declarations and images with base64 encoded versions. Finally it will embed the resulting SVGs into the document and remove them after 1 second. At the same time references in the css are replaced with utf8 encoded SVGs.

## Using flattensvg.js for development:

The script can be used as a development tool for speeding up loading time as well: if you pass "true" as a parameter to the script, textareas with the source of all the flattened SVGs will be displayed for convenient copying. The new SVG contains no more external resources. Replace the current SVGs with the fixed SVGs and the number of http-requests will be reduced.

## How to include flattensvg.js:

Iclude it into the head of your page, after the css declarations.
## License

flattensvg.js is licensed under the terms of the MIT License, see the included MIT-LICENSE file.

More infos and demos on www.eleqtriq.com