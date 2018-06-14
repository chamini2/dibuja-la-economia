const state = {};

d3.selectAll('.you-draw-it').each(function() {
  const sel = d3.select(this);
  const key = this.dataset.key;
  const question = window.ydi_data[key];
  const indexedData = question.data;
  const data = Object.keys(indexedData).map(key => {
    return {
      year: Number(key),
      value: indexedData[key]
    }
  });

  if (!state[key]) {
    state[key] = {};
  }

  const minYear = data[0].year;
  const maxYear = data[data.length - 1].year;

  // denote points on graph
  const periods = [
    {year: 2005, class: 'black', title: ''},
    {year: 2009, class: 'black', title: ''},
    {year: 2013, class: 'black', title: ''},
    {year: Math.min(maxYear), class: 'black', title: ''}
  ];

  // position for starting to draw
  // const medianYear = periods[periods.length - 4].year;
  const medianYear = 2005;

  // min and max values of used data
  const minY = d3.min(data, d => d.value);
  const maxY = d3.max(data, d => d.value);

  const segmentBorders = [minYear].concat(periods.map(d => d.year));

  const margin = {
    top: 40,
    right: 20,
    bottom: 40,
    left: 50
  };

  window.addEventListener('resize', () => {
    // TODO
  })

  const width = sel.node().offsetWidth;
  const height = 400;
  const c = {
    width: width - (margin.left + margin.right),
    height: height - (margin.top + margin.bottom)
  };

  // configure scales
  const graphMinY = Math.min(minY, 0);
  // add 20% for segment titles (not currently used)
  let graphMaxY = Math.max(indexedData[medianYear] * 2, maxY + (maxY - graphMinY) * 0.2);
  // round down to the nearest thousand
  graphMaxY = Math.round(graphMaxY/1000)*1000;
  c.x = d3.scaleLinear().range([0, c.width]);
  c.x.domain([minYear, maxYear]);
  c.y = d3.scaleLinear().range([c.height, 0]);
  c.y.domain([graphMinY, graphMaxY]);

  c.svg = sel.append('svg')
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    .attr("width", c.width)
    .attr("height", c.height);

  // label axes
  c.svg.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "top")
    .attr("y", -20)
    .attr("x", -50)
    .text("Anzahl der Ärzte");

  c.svg.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "right")
    .attr("x", c.width - 34)
    .attr("y", c.height + 35)
    .text("Jahre");

  // gradients (area below graph)
  c.defs = d3.select(c.svg.node().parentNode).append('defs');
  ['black', 'red'].forEach(color => {
    const gradient = c.defs.append('linearGradient')
      .attr('id', 'gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    gradient.append('stop').attr('offset', '50%').attr('class', 'start');
  });

  // add preview arrow
  c.defs.append('marker')
    .attr('id', 'preview-arrow')
    .attr('orient', 'auto')
    .attr('markerWidth', 2)
    .attr('markerHeight', 4)
    .attr('refX', 0.1)
    .attr('refY', 2)
    .append('path')
    .attr('d', 'M0,0 V4 L2,2 Z');

  // make background grid
  c.grid = c.svg.append('g').attr('class', 'grid');
  c.grid.append('g').attr('class', 'horizontal').call(
    d3.axisBottom(c.x)
      .tickValues(c.x.ticks(maxYear - minYear))
      .tickFormat("")
      .tickSize(c.height)
    )
    // lines to show segments
    .selectAll('line')
    .attr('class', (d, i) => segmentBorders.indexOf(d) !== -1 ? 'highlight' : '');

  c.grid.append('g').attr('class', 'vertical').call(
    d3.axisLeft(c.y)
      .tickValues(c.y.ticks(graphMaxY/2000))
      .tickFormat("")
      .tickSize(-c.width)
    );

  // invisible rect to make dragging work
  const dragArea = c.svg.append('rect')
    .attr('class', 'draggable')
    .attr('x', c.x(medianYear))
    .attr('width', c.x(maxYear) - c.x(medianYear))
    .attr('height', c.height)
    .attr('opacity', 0);

  setTimeout(() => {
    const clientRect = c.svg.node().getBoundingClientRect();
    c.top = clientRect.top + window.scrollY;
    c.bottom = clientRect.bottom + window.scrollY;
  }, 1000);

  c.labels = sel.append('div')
    .attr('class', 'labels')
    .call(applyMargin);
  c.axis = c.svg.append('g');
  c.charts = c.svg.append('g');

  // add a preview line with arrow
  c.preview = c.svg.append('line')
    .attr('class', 'preview-line')
    .attr('marker-end', 'url(#preview-arrow)')
    .attr('x1', c.x(medianYear))
    .attr('y1', c.y(indexedData[medianYear]))
    .attr('x2', c.x(medianYear) + 100)
    .attr('y2', c.y(indexedData[medianYear]));

  const userSel = c.svg.append('path').attr('class', 'your-line');

  c.dots = c.svg.append('g').attr('class', 'dots');

  // configure axes
  c.xAxis = d3.axisBottom().scale(c.x);
  // formats year
  c.xAxis.tickFormat(d => String(d).substr(2)).ticks(10, maxYear - minYear);
  c.yAxis = d3.axisLeft().scale(c.y);
  // 2000 => steps on y-axis (TODO)
  c.yAxis.tickFormat(d => String(d).substr(0)).ticks(graphMaxY/2000);
  drawAxis(c);

  c.titles = sel.append('div')
    .attr('class', 'titles')
    .call(applyMargin);

  c.controls = sel.append('div')
    .attr('class', 'controls')
    .call(applyMargin)
    .style('padding-left', c.x(medianYear) + 'px');

  c.controls.append('div')
    .attr('class', 'box')
    .text('Zeichnen Sie die Linie zu Ende');

  // make chart
  const charts = periods.map((entry, key) => {
    const lower = key > 0 ? periods[key - 1].year : minYear;
    const upper = entry.year;

    // segment title
    c.titles.append('span')
      .style('left', c.x(lower) + 'px')
      .style('width', c.x(upper) - c.x(lower) + 'px')
      .text(entry.title);

    return drawChart(lower, upper, entry.class);
  });

  const resultChart = charts[charts.length - 3][0];
  const resultChart2 = charts[charts.length - 2][0];
  const resultChart3 = charts[charts.length - 1][0];

  const resultClip = c.charts.append('clipPath')
    .attr('id', `result-clip-${key}`)
    .append('rect')
    .attr('width', c.x(medianYear))
    .attr('height', c.height);

  const resultLabel = charts[charts.length - 1].slice(1, 3);
  const resultLabel2 = charts[charts.length - 2].slice(1, 3);
  const resultLabel3 = charts[charts.length - 3].slice(1, 3);

  resultChart.attr('clip-path', `url(#result-clip-${key})`)
    .append('rect')
    .attr('width', c.width)
    .attr('height', c.height)
    .attr('fill', 'none');

  resultChart2.attr('clip-path', `url(#result-clip-${key})`)
    .append('rect')
    .attr('width', c.width)
    .attr('height', c.height)
    .attr('fill', 'none');

  resultChart3.attr('clip-path', `url(#result-clip-${key})`)
    .append('rect')
    .attr('width', c.width)
    .attr('height', c.height)
    .attr('fill', 'none');

  resultLabel.map(e => e.style('opacity', 0));
  resultLabel2.map(e => e.style('opacity', 0));
  resultLabel3.map(e => e.style('opacity', 0));

  /*
   * Interactive user selection part
   */
  const userLine = d3.line().x(ƒ('year', c.x)).y(ƒ('value', c.y));

  if (!state[key].yourData) {
    state[key].yourData = data.map(d => ({
      year: d.year,
      value: indexedData[medianYear],
      defined: 0
    }))
    .filter(d => {
      if (d.year == medianYear) {
        d.defined = true;
      }
      return d.year >= medianYear
    });
  }

  const resultSection = d3.select('.result.' + key);

  c.svg.call(d3.drag().on('drag', interactionHandler));
  c.svg.on('click', interactionHandler);

  resultSection.select('button').on('click', showResultChart);

  // quick fix (TODO)
  document.getElementById('refreshButton').onclick = function(event) {
    location.reload();
  }

  // function removeResultChart() {
  //   // restore untouched state
  //   // TODO
  //   sel.node().classList.remove('drawn');
  //   sel.node().classList.remove('resultMode');
  //
  //   // remove text and change buttons
  //   sel.node().nextSibling.nextSibling.classList.remove('shown'); //resultSection.node().classList.add('shown');
  //   document.getElementById('actionContainerShowButton').setAttribute('disabled', 'true');
  //
  //   resultChart.remove();
  //   resultChart2.remove();
  //   dragArea.attr('class', 'draggable');
  //
  //   state[key].resultShown = false;
  //   state[key].completed = false;
  //
  //   resultLabel.map(e => e.style('opacity', 0));
  //   resultLabel2.map(e => e.style('opacity', 0));
  //
  //   // remove user line
  //   userSel.remove();
  //   // remove last label
  //   c.labels._groups[0][0].lastChild.remove();
  // }

  // positions the preview arrow up and down
  sel.on('mousemove', () => {
    const pos = d3.mouse(c.svg.node());
    const y = Math.min(Math.max(pos[1], c.y(graphMaxY)), c.y(graphMinY));
    c.preview.attr('y2', y);
  });

  /*
   * functions
   */

  function ƒ() {
    const functions = arguments;
    // convert all string arguments into field accessors
    for (let i = 0; i < functions.length; i++) {
      if (typeof(functions[i]) === 'string' || typeof(functions[i]) === 'number') {
        functions[i] = (str => function (d) {
          return d[str];
        })(functions[i]);
      }
    }
    // return composition of functions
    return function(d) {
      let i = 0, l = functions.length;
      while (i++ < l) d = functions[i - 1].call(this, d);
      return d
    }
  }

  function drawAxis(c) {
    c.axis.append('g')
      .attr("class", "x axis")
      .attr("transform", "translate(0," + c.height + ")")
      .call(c.xAxis);
    c.axis.append('g')
      .attr("class", "y axis")
      .call(c.yAxis);
  }

  function formatValue(val, defaultPrecision) {
    const data = question.precision >= 0 ?
      Number(val).toFixed(question.precision) :
      defaultPrecision ? Number(val).toFixed(defaultPrecision) : val;

    // don't show label text for unit (specified in yml file) if screensize is below 600
    const width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    if (width <= 600) {
      return String(data).replace('.', ',');
    }
    return String(data).replace('.', ',') + (question.unit ? ' ' + question.unit : '');
  }

  function makeLabel(pos, addClass) {
    const x = c.x(pos);
    const y = c.y(indexedData[pos]);
    const text = formatValue(indexedData[pos]);

    const label = c.labels.append('div')
      .classed('data-label', true)
      .classed(addClass, true)
      .style('left', x + 'px')
      .style('top', y + 'px');
    label.append('span').text(text);

    if (pos == minYear) {
      label.classed('edge-left', true);
    }

    if (pos == maxYear) {
      label.classed('edge-right', true);
    }

    return [
      c.dots.append('circle')
        .attr('r', 5)
        .attr('cx', x)
        .attr('cy', y)
        .attr('class', addClass),
      label
    ];
  }

  // draw premature chart
  function drawChart(lower, upper, addClass) {
    const definedFn = (d, i) => d.year >= lower && d.year <= upper;
    const area = d3.area().x(ƒ('year', c.x)).y0(ƒ('value', c.y)).y1(c.height).defined(definedFn);
    const line = d3.area().x(ƒ('year', c.x)).y(ƒ('value', c.y)).defined(definedFn);

    if (lower == minYear) {
      makeLabel(minYear, addClass);
    }

    const svgClass = addClass + (upper == medianYear ? " median" : '');

    const group = c.charts.append('g');
    group.append('path').attr('d', area(data)).attr('class', 'area ' + svgClass).attr('fill', `url(#gradient)`);
    group.append('path').attr('d', line(data)).attr('class', 'line ' + svgClass);

    return [
      group,
    ].concat(makeLabel(upper, svgClass));
  }

  function drawUserLine() {
    userSel.attr('d', userLine.defined(ƒ('defined'))(state[key].yourData));

    const d = state[key].yourData[state[key].yourData.length-1];
    if (!d.defined) { return; }

    const yourResult = c.labels.selectAll('.your-result').data([d]);
    yourResult.enter()
      .append('div')
      .classed('data-label your-result', true)
      .classed('edge-right', true)
      .merge(yourResult)
      .style('left', () => c.x(maxYear) + 'px')
      .style('top', r => c.y(r.value) + 'px')
      .html('')
      .append('span')
      .text(r => formatValue(r.value, 0));
  }

  function clamp(a, b, c) {
    return Math.max(a, Math.min(b, c));
  }

  function interactionHandler() {
    sel.node().classList.add('drawn');

    const pos = d3.mouse(c.svg.node());
    const year = clamp(medianYear, maxYear, c.x.invert(pos[0]));
    const value = clamp(c.y.domain()[0], c.y.domain()[1], c.y.invert(pos[1]));

    state[key].yourData.forEach(d => {
      if (d.year > medianYear) {
        if (Math.abs(d.year - year) < .5) {
          d.value = value;
        }
        if (d.year - year < 0.5) {
          d.defined = true
        }
      }
    });

    if (!state[key].resultShown) {
      drawUserLine();
    }

    if (!state[key].completed && d3.mean(state[key].yourData, ƒ('defined')) == 1) {
      state[key].completed = true;
      resultSection.select('button').node().removeAttribute('disabled');
    }
  }

  function applyMargin(sel) {
    sel.style('left', margin.left + 'px')
      .style('top', margin.top + 'px')
      .style('width', c.width + 'px')
      .style('height', c.height + 'px');
  }

  function showResultChart() {
    sel.node().classList.add('resultMode');
    state[key].resultShown = true;
    resultClip.transition().duration(700).attr('width', c.x(maxYear));
    dragArea.attr('class', '');
    setTimeout(() => {
      resultLabel.map(e => e.style('opacity', 1));
      resultLabel2.map(e => e.style('opacity', 1));
      resultLabel3.map(e => e.style('opacity', 1));
      resultSection.node().classList.add('shown');
    }, 700);
  }

});
