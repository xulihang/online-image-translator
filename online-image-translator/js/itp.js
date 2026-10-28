// ImageTrans Project Export
// Writes a .itp project file (plain JSON) from a translation result, so the
// text can be edited in ImageTrans:
//   - one entry per image, keyed by the image's own file name
//   - one text box per translated box (geometry, source text, target text)
// The image itself is not included: the user already has it, and ImageTrans
// resolves it from the project's dirPath (".").

const ITP = (function() {
  'use strict';

  function download(text, filename) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  }

  function baseProject() {
    const sourceLang = Settings.get('sourceLang');
    const targetLang = Settings.get('targetLang');
    return {
      settings: {
        sourceLang: (sourceLang && sourceLang !== 'auto') ? sourceLang : 'zh',
        targetLang: (targetLang && targetLang !== 'auto') ? targetLang : 'en',
        intermediateResultFolder: 'intermediateResults',
        output_folder: 'out'
      },
      images: {},
      UISettings: {
        vertical: false,
        autoClean: true,
        removeSpaces: false,
        autoCapital: false,
        opacity: 100,
        percent: 30
      },
      terms: {},
      dirPath: './',
      previousOCR: { engineName: 'rapid', lang: '0' }
    };
  }

  // options: { fileName, boxes, scale, targetLang, filename }
  // scale: working image size / original image size. Box geometry is in working
  // image pixels (the image is rescaled before OCR), but ImageTrans measures the
  // boxes on the original image, so they are divided by it.
  function exportITP(options) {
    const fileName = options.fileName || 'image.jpg';
    const scale = options.scale > 0 ? options.scale : 1;
    const toOriginal = function(v) { return Math.round(v / scale); };
    const boxes = (options.boxes || []).map(function(box) {
      const geo = box.geometry || {};
      return {
        geometry: {
          X: toOriginal(geo.X || geo.x || 0),
          width: toOriginal(geo.width || geo.Width || 0),
          Y: toOriginal(geo.Y || geo.y || 0),
          height: toOriginal(geo.height || geo.Height || 0)
        },
        text: box.source || box.text || '',
        target: box.target
      };
    }).filter(function(box) {
      return box.target && box.geometry.width > 0 && box.geometry.height > 0;
    });
    if (!boxes.length) throw new Error('No text boxes to export.');

    const project = baseProject();
    if (options.targetLang) project.settings.targetLang = options.targetLang;
    project.images[fileName] = { boxes: boxes };

    const imageBaseName = fileName.replace(/\.[^.]+$/, '');
    download(JSON.stringify(project, null, 4), options.filename || imageBaseName + '.itp');
  }

  return {
    export: exportITP
  };
})();
