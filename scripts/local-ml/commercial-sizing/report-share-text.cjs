'use strict';

// Self-contained so the same serializer runs in the standalone HTML and tests.
function buildReportShareText(document, data) {
  const cell = value => String(value ?? 'N/A').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
  const table = (headers, rows) => '\n\n| ' + headers.map(cell).join(' | ') + ' |\n| '
    + headers.map(() => '---').join(' | ') + ' |\n'
    + rows.map(row => '| ' + row.map(cell).join(' | ') + ' |').join('\n') + '\n\n';
  const linkText = node => {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return '';
    const text = Array.from(node.childNodes).map(linkText).join('');
    return node.tagName === 'A' ? '[' + text.trim() + '](' + node.getAttribute('href') + ')' : text;
  };
  function htmlTable(element) {
    const headerRows = Array.from(element.querySelectorAll('thead tr'));
    const grid = [];
    headerRows.forEach((row, r) => {
      grid[r] ||= [];
      let column = 0;
      for (const header of row.children) {
        while (grid[r][column] !== undefined) column += 1;
        for (let down = 0; down < header.rowSpan; down += 1) {
          grid[r + down] ||= [];
          for (let across = 0; across < header.colSpan; across += 1) {
            grid[r + down][column + across] = header.textContent.trim();
          }
        }
        column += header.colSpan;
      }
    });
    const width = Math.max(0, ...grid.map(row => row.length));
    const headers = Array.from({ length: width }, (_, column) => [...new Set(grid.map(row => row[column]).filter(Boolean))].join(' · '));
    const rows = Array.from(element.querySelectorAll('tbody tr')).map(row => Array.from(row.children).map(linkText));
    return table(headers, rows);
  }
  function allDecisions() {
    const headers = ['Decision', 'Person', 'Product', 'MyAIFitting link', 'Category', 'Actual waist cm', 'Actual hip cm',
      'AI waist cm', 'AI hip cm', 'Waist error cm', 'Hip error cm', 'Reference size', 'AI size', 'Size steps',
      'Result', 'Confidence', 'Adjacent gap cm', 'Gap measurement', 'Boundary distance cm', 'Boundary midpoint cm',
      'Boundary measurement', 'Waist uncertainty cm', 'Hip uncertainty cm', 'Confidence ratio', 'Gap / absolute error',
      'Apple correction', 'Quality flags', 'Keep/exchange', 'Notes'];
    return ['aiad', 'v8'].map(model => {
      const rows = data.decisions[model];
      return '\n\n### ' + (model === 'v8' ? 'Our model' : 'Aiad') + ' — all ' + rows.length + ' decisions\n'
        + table(headers, rows.map(row => [row.decisionId, row.person.scanId, row.product.title, row.product.myaifittingUrl,
          row.product.category, row.actualTapeCm.waist, row.actualTapeCm.hips, row.predictedTapeCm.waist, row.predictedTapeCm.hips,
          row.signedErrorCm.waist, row.signedErrorCm.hips, row.referenceSize, row.predictedSize, row.chartSteps, row.result,
          row.confidence.label, row.adjacentGap?.cm, row.adjacentGap?.measurement, row.nearestBoundary?.distanceCm,
          row.nearestBoundary?.boundaryCm, row.nearestBoundary?.measurement, row.sigmaCm?.waist, row.sigmaCm?.hips,
          row.confidence.ratio, row.gapErrorRatio?.display, row.apple.status, row.dataQualityFlag.join('; '),
          row.keepExchange.outcome, row.notes.join(' ')]));
    }).join('\n');
  }
  function walk(node) {
    if (node.nodeType === 3) return node.textContent.replace(/\s+/g, ' ');
    if (node.nodeType !== 1) return '';
    if (node.matches('script, style, button, input, select, textarea, .toolbar, .filters, #visible-count')) return '';
    if (node.matches('.decision-table')) return allDecisions();
    if (node.tagName === 'TABLE') return htmlTable(node);
    if (node.tagName === 'A') return linkText(node);
    const text = Array.from(node.childNodes).map(walk).join(' ').trim();
    if (/^H[1-6]$/.test(node.tagName)) return '\n\n' + '#'.repeat(Number(node.tagName[1])) + ' ' + text + '\n\n';
    if (node.tagName === 'LI') return '\n- ' + text;
    if (['P', 'DIV', 'SECTION', 'ARTICLE', 'HEADER', 'DETAILS', 'SUMMARY', 'UL'].includes(node.tagName)) return '\n\n' + text + '\n\n';
    return text;
  }
  return walk(document.querySelector('main')).replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

module.exports = { buildReportShareText };
