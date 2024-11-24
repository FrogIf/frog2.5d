/**
 * 2.5d流程图绘制
 * @param {} options 
 * @returns 
 */
function frogFake3d(options){
  /**
   * 初始化
   */
  function init(options){
    options._localDom = options.dom;
    if(!options.view){
      options.view = {};
    }
    if(!options.view.width){
      options.view.width = options.dom.clientWidth;
    }
    if(!options.view.height){
      options.view.height = options.dom.clientHeight;
    }
    options.dom.innerHTML += '<div class="frog3d" style="overflow:hidden;position:relative;width:'+options.view.width+'px;height:'+options.view.height+'px;"><div class="frog3d-tooltip" style="position:absolute;z-index:10;display:none;"></div><div class="frog3d-container" style="position:relative;z-index:2;transition: transform 0.2s ease-out;"></div></div>';
    let parent = getFirstDomByTagNameAndClass(options.dom, 'div', 'frog3d');
    options._container = getFirstDomByTagNameAndClass(parent, 'div', 'frog3d-container');
    options._tooltip = getFirstDomByTagNameAndClass(parent, 'div', 'frog3d-tooltip');
    if(options.backgroundColor){
      parent.style.backgroundColor = options.backgroundColor;
    }

    let mouseOffsetX, mouseOffsetY;
    let isDragging = false;
    // 鼠标移动时触发
    function dragElement(event) {
      if (!isDragging) return;
      event.preventDefault();
      options._container.style.left = `${event.clientX - mouseOffsetX}px`;
      options._container.style.top = `${event.clientY - mouseOffsetY}px`;
    }
    // 鼠标释放时触发
    function stopDragging(event) {
      isDragging = false;
      event.preventDefault();
      parent.removeEventListener('mousemove', dragElement);
      parent.removeEventListener('mouseup', stopDragging);
    }
    parent.addEventListener('mousedown', function(event){
      event.preventDefault();
      isDragging = true;
      mouseOffsetX = event.clientX - options._container.offsetLeft;
      mouseOffsetY = event.clientY - options._container.offsetTop;
      parent.addEventListener('mousemove', dragElement);
      parent.addEventListener('mouseup', stopDragging);
    });
    parent.addEventListener('mouseout', function(event){
      // 鼠标移出区域后, 停用拖拽
      isDragging = isDragging && parent.contains(event.toElement);
      // isDragging = isChildOf(event.toElement, parent, 6);
    });

    // 画布缩放
    parent.addEventListener('wheel', function(event){
      event.preventDefault();
      let dy = event.deltaY;
      if(dy != 0){
        let scale = getScaleValue(options._container);
        if(dy < 0){
          scale *= 1.05;
        }else{
          scale /= 1.05;
        }
        if(scale < (options.maxScale??3) && scale > (options.minScale??0.5)){
          options._container.style.transformOrigin = 'center';
          options._container.style.transform = `scale(${scale})`;
        }
      }
    });
    parent.addEventListener('dblclick', function(){ // 取消所有高亮显示
      let traceDoms = options._container.getElementsByClassName('frog3d-trace');
      if(traceDoms){
        for(let t of traceDoms){
          t.style.opacity = 1;
        }
      }
      let nodeDomList = options._container.getElementsByClassName('frog3d-node');
      if(nodeDomList){
        for(let n of nodeDomList){
          n.style.opacity = 1;
        }
      }
    });

    drawGrid(options, options.view.width, options.view.height, 0, 0, 0, 0); // 绘制背景网格
  }

  function getScaleValue(dom) {
    // 获取transform属性的值
    const transform = dom.style.transform;
    if(!transform){ return 1; }
    // 解析scale值
    return parseScale(transform);
  }

  function parseScale(transformString) {
    // 正则表达式匹配scale值
    const match = transformString.match(/scale\(([\d.]+)\)/);
    // 如果找到了匹配项，返回scale值
    if (match) {
      return parseFloat(match[1]);
    }
    // 如果没有找到scale值，返回1（默认值）
    return 1;
  }

  /**
   * 绘制背景网格
   */
  function drawGrid(options, width, height, leftPadding, topPadding, rightPadding, bottomPadding){
    if(!options.grid){ return; }
    let grid = options.grid;
    let dom = options._container;
    removeFirstTagByNameAndClass(dom, 'div', 'frog3d-background');
    let gap = grid.gap??30;
    let lineStyle = ''; 
    if(grid.type == 'dashed'){
      lineStyle = ' stroke-dasharray="5, 5" ';
    }else if(grid.type == 'dotted'){
      lineStyle = ' stroke-dasharray="1, 5" ';
    }

    let matrix = options.transformMatrix??[[1, 0],[0, 1]];
    let v1 = vectorNormalize(matrix[0]);
    let v2 = vectorNormalize(matrix[1]);
    matrix = [
      v1, v2
    ];

    let a1 = vectorTransform([0, gap], matrix);
    let a2 = vectorTransform([gap, gap], matrix);
    let a3 = vectorTransform([gap, 0], matrix);
    let a4 = vectorTransform([0, 0], matrix);
    let offsetY = - Math.min(a1[1], a2[1], a3[1], a4[1]);
    let offsetX = - Math.min(a1[0], a2[0], a3[0], a4[0]);
    a1[0] += offsetX;
    a2[0] += offsetX;
    a3[0] += offsetX;
    a4[0] += offsetX;
    a1[1] += offsetY;
    a2[1] += offsetY;
    a3[1] += offsetY;
    a4[1] += offsetY;
    let maxX = Math.max(a1[0], a2[0], a3[0], a4[0]);
    let maxY = Math.max(a1[1], a2[1], a3[1], a4[1]);

    let viewWidth = width + leftPadding + rightPadding;
    let viewHeight = height + topPadding + bottomPadding;
    let svgHtml = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${viewWidth}" height="${viewHeight}" viewBox="${0-leftPadding} ${0-topPadding} ${width + rightPadding} ${height + bottomPadding}" >
       <defs>
          <pattern id="frog3d-gridunit" patternUnits="userSpaceOnUse" width="${maxX}" height="${maxY}">
            <line x1="${a1[0]}" y1="${a1[1]}" x2="${a2[0]}" y2="${a2[1]}" stroke="${grid.lineColor??'#cccccc'}" ${lineStyle}/>
            <line x1="${a2[0]}" y1="${a2[1]}" x2="${a3[0]}" y2="${a3[1]}" stroke="${grid.lineColor??'#cccccc'}" ${lineStyle}/>
            <line x1="${a3[0]}" y1="${a3[1]}" x2="${a4[0]}" y2="${a4[1]}" stroke="${grid.lineColor??'#cccccc'}" ${lineStyle}/>
            <line x1="${a4[0]}" y1="${a4[1]}" x2="${a1[0]}" y2="${a1[1]}" stroke="${grid.lineColor??'#cccccc'}" ${lineStyle}/>
          </pattern>
        </defs>
        <rect x="${0-leftPadding}" y="${0-topPadding}" width="${viewWidth}" height="${viewHeight}" fill="url(#frog3d-gridunit)"/></svg>`
    dom.innerHTML += `<div class="frog3d-background" style="position:absolute;left:${0-leftPadding}px;top:${0-topPadding}px">${svgHtml}</div>`;
  }

  // /**
  //  * 与视图窗口边缘相交的坐标
  //  * ---------hv1---------
  //  * |                 |
  //  * vv1               vv2
  //  * |                 |
  //  * ---------hv2---------
  //  */
  // function viewWindowIntersectCoorinate(v1, v2, gap, minX, minY, maxX, maxY, index, direction/*方向: >=0正向;<=0反向*/){
  //   let dir = direction < 0 ? -1 : 1;
  //   let coord = {
  //     hv1: [gap * index * dir * v1[0] + (minY - gap * index * dir * v1[1]) * v2[0] / v2[1], minY],
  //     hv2: [gap * index * dir * v1[0] + (maxY - gap * index * dir * v1[1]) * v2[0] / v2[1], maxY],
  //     vv1: [minX, gap * index * dir * v1[1] + (minX - gap * index * dir* v1[0]) * v2[1] / v2[0]],
  //     vv2: [maxX, gap * index * dir * v1[1] + (maxX - gap * index * dir * v1[0]) * v2[1] / v2[0]]
  //   };

  //   /**
  //    * 找到第一象限/x轴正向/y轴正向的点
  //    * 并且尽可能保证点在视窗内
  //    */
  //   let pArr = [];

  //   // 完全在视窗内
  //   if(coord.hv1[0] > minX && coord.hv1[0] <= maxX){ 
  //     pArr.push(coord.hv1);
  //   }
  //   if(coord.hv2[0] > minX && coord.hv2[0] <= maxX){
  //     pArr.push(coord.hv2);
  //   }
  //   if(coord.vv1[1] > minY && coord.vv1[1] <= maxY){
  //     pArr.push(coord.vv1);
  //   }
  //   if(coord.vv2[1] > minY && coord.vv2[1] <= maxY){
  //     pArr.push(coord.vv2);
  //   }
    
  //   if(coord.hv1[0] == minX){
  //     pArr.push(coord.hv1);
  //   }
  //   if(coord.hv2[0] == minX){
  //     pArr.push(coord.hv2);
  //   }
  //   if(coord.vv1[1] == minY){
  //     pArr.push(coord.vv1)
  //   }
  //   if(coord.vv2[1] == minY){
  //     pArr.push(coord.vv2);
  //   }

  //   if(pArr.length >= 2){
  //     return {
  //       v: pArr[0],
  //       h: pArr[1]
  //     };
  //   }
  //   return null;
  // }

  function getFirstDomByTagNameAndClass(parent, tagName, className){
    let dom = null;
    tagName = tagName.toLowerCase();
    for(let i = 0; i < parent.children.length; i++){
      let d = parent.children[i];
      if(d.tagName.toLowerCase() == tagName && d.classList.contains(className)){
        dom = d;
        break;
      }
    }
    return dom;
  }

  function removeFirstTagByNameAndClass(parent, tagName, className){
    let dom = getFirstDomByTagNameAndClass(parent, tagName, className);
    if(dom){
      parent.removeChild(dom);
    }
  }

  /**
   * 获取拓扑图
   */
  function insertHtml(options, nodeList, linkList){
    let dom = options._container;
    dom.style.left = '0px';
    dom.style.top = '0px';
    let parentWidth = options.view.width;
    let parentHeight = options.view.height;
    let nodeWeightX = 0;
    let nodeWeightY = 0;
    let nodeMaxX = 0;
    let nodeMaxY = 0;
    for(let nn of nodeList){
      nodeWeightX += nn.x;
      nodeWeightY += nn.y;
      nodeMaxX = Math.max(nodeMaxX, nn.x);
      nodeMaxY = Math.max(nodeMaxY, nn.y);
    }
    nodeWeightY = nodeWeightY == 0 ? 0 : (nodeWeightY / nodeList.length);
    nodeWeightX = nodeWeightX == 0 ? 0 : (nodeWeightX / nodeList.length);
    let width = Math.max(parentWidth, nodeMaxX);
    let height = Math.max(parentHeight, nodeMaxY);
    for(let ll of linkList){
      for(let p of ll.path){
        width = Math.max(width, p[0]);
        height = Math.max(height, p[1]);
      }
    }

    let leftPadding = 0;
    let rightPadding = 0;
    let topPadding = 0;
    let bottomPadding = 0;
    if(options.padding){
      let both = options.padding.both??0;
      if(options.padding.left){
        leftPadding += options.padding.left;
      }else{
        leftPadding += both;
      }
      if(options.padding.top){
        topPadding += options.padding.top;
      }else{
        topPadding += both;
      }
      if(options.padding.right){
        rightPadding += options.padding.right;
      }else{
        rightPadding += both;
      }
      if(options.padding.bottom){
        bottomPadding += options.padding.bottom;
      }else{
        bottomPadding += both;
      }
    }

    let weightNode = {
      x : nodeWeightX,
      y : nodeWeightY
    };

    let scalePos = 'top left';
    if(options.autoCenter){ // 居中(重心)
      scalePos = `${nodeWeightX}px ${nodeWeightY}px`;
      let offsetX = options.view.width / 2 - nodeWeightX;
      let offsetY = options.view.height / 2 - nodeWeightY;
      if(offsetX < 0){
        dom.style.left = offsetX + 'px';
        offsetX = 0;
      }
      if(offsetY < 0){
        dom.style.top = offsetY + 'px';
        offsetY = 0;
      }
      for(let nn of nodeList){
        nn.x += offsetX;
        nn.y += offsetY;
      }
      weightNode.x += offsetX;
      weightNode.y += offsetY;
      for(let ll of linkList){
        for(let p of ll.path){
          p[0] += offsetX;
          p[1] += offsetY;
        }
      }
    }

    if(options.autoScale){
      let s1 = 0;
      let s2 = 0;
      if(width > parentWidth){
        s1 = parentWidth / width;
      }
      if(height > parentHeight){
        s2 = parentHeight / height;
      }
      let scale = Math.max(s1, s2);
      scale = scale == 0 ? 1 : scale;
      scale = scale > (options.minScale??0.5) ? scale : 0.5;
      dom.style.transformOrigin = scalePos;
      dom.style.transform = 'scale('+scale+')';
    }else{
      dom.style.transform = 'scale(1)';
    }

    // 重新画网格
    drawGrid(options, width, height, leftPadding, topPadding, rightPadding, bottomPadding);
    removeFirstTagByNameAndClass(dom, 'div', 'frog3ddata');
    
    dom.innerHTML += '<div class="frog3ddata"></div>';
    let showRegion = getFirstDomByTagNameAndClass(dom, 'div', 'frog3ddata');
    options._data = showRegion;
    
    if(linkList){
      let htmlContent = '';
      htmlContent += '<svg xmlns="http://www.w3.org/2000/svg" class="frog3d-link" width="'+width+'" height="'+height+'" style="position:absolute;top:0px;left:0px;">';
      let lineOpt = options.line??{};
      let lineStyle = ''; 
      if(lineOpt.type == 'dashed'){
        lineStyle = ' stroke-dasharray="5, 5" ';
      }else if(lineOpt.type == 'dotted'){
        lineStyle = ' stroke-dasharray="1, 5" ';
      }
      let lineWidth = lineOpt.width??1;
      htmlContent += '<g stroke-width="'+(lineOpt.width??1)+'" '+lineStyle+'>';
      for(let ll of linkList){
        let c = getLineColor(ll.line, lineOpt); 
        htmlContent += generateLink(ll, c, lineWidth, options);
      }
      htmlContent += '</svg>';
      showRegion.innerHTML += htmlContent;
    }

    for(let i = 0; i < nodeList.length; i++){
      let nn = nodeList[i];
      generatePoint(showRegion, nn, options);
    }

    if(options.point && options.point.tooltip){
      let nodeDoms = showRegion.getElementsByClassName('frog3d-node');
      if(nodeDoms){
        let nodeIdToNode = {};
        for(let i = 0; i < nodeList.length; i++){
          let n = nodeList[i];
          nodeIdToNode[n.node.id] = n;
        }
        for(let nodeDom of nodeDoms){
          nodeDom.addEventListener('mouseover', function(event){
            options._tooltip.innerHTML = options.point.tooltip(nodeIdToNode[nodeDom.dataset.id].node);
            let pPos = options._localDom.getBoundingClientRect();
            options._tooltip.style.left = (event.pageX - pPos.left) + 10 + 'px';
            options._tooltip.style.top = (event.pageY - pPos.top) + 10 + 'px';
            options._tooltip.style.display = 'block';
          });
          nodeDom.addEventListener('mouseout', function() {
            options._tooltip.style.display = 'none';
          });
          nodeDom.addEventListener('dblclick', (event) => {
            event.stopPropagation();
            let nodeId = nodeDom.dataset.id;
            let traceDoms = options._container.getElementsByClassName('frog3d-trace');
            let relateNodeIds = [ nodeId ];
            if(traceDoms){
              for(let t of traceDoms){
                let sb = t.dataset.source != nodeId;
                let tb = t.dataset.target != nodeId;
                if(sb && tb){
                  t.style.opacity = 0.2;
                }else {
                  t.style.opacity = 1;
                  if(sb){
                    relateNodeIds.push(t.dataset.source);
                  }else if(tb){
                    relateNodeIds.push(t.dataset.target);
                  }
                }
              }
            }
            let nodeDomList = options._container.getElementsByClassName('frog3d-node');
            if(nodeDomList){
              for(let n of nodeDomList){
                if(relateNodeIds.indexOf(n.dataset.id) < 0){
                  n.style.opacity = 0.3;
                }else{
                  n.style.opacity = 1;
                }
              }
            }
          });

          // 节点移动
          // let draggable = false;
          // function dragPoint(event){
          //   if(draggable){
          //     event.stopPropagation();
          //     let scale = getScaleValue(options._container);
          //     let rect = options._container.getBoundingClientRect();
          //     nodeDom.style.left = `${(event.clientX - rect.left)/scale}px`;
          //     nodeDom.style.top = `${(event.clientY - rect.top)/scale}px`;
          //   }
          // }
          // function stopDrag(event){
          //   event.stopPropagation();
          //   event.preventDefault();
          //   draggable = false;
          //   nodeDom.removeEventListener('mousemove', dragPoint);
          //   nodeDom.removeEventListener('mouseup', stopDrag);
          //   nodeDom.style.zIndex = 'auto';
          // }
          // nodeDom.addEventListener('mousedown', (event) => {
          //   event.stopPropagation();
          //   event.preventDefault();
          //   draggable = true;
          //   nodeDom.style.zIndex = 5;
          //   nodeDom.addEventListener('mousemove', dragPoint);
          //   nodeDom.addEventListener('mouseup', stopDrag);
          // });
        }
      }
    }

    if(options.line && options.line.tooltip){
      let masklink = getFirstDomByTagNameAndClass(showRegion, 'svg', 'frog3d-link');
      if(masklink){
        let links = masklink.getElementsByClassName('frog3d-linkevent');
        let idToLine = [];
        for(let ll of linkList){
          idToLine[ll.lineId] = ll.line;
        }
        for(let link of links){
          link.addEventListener('mouseover', function(event){
            options._tooltip.innerHTML = options.line.tooltip(idToLine[event.target.dataset.id]);
            let pPos = options._localDom.getBoundingClientRect();
            options._tooltip.style.left = (event.pageX - pPos.left) + 10 + 'px';
            options._tooltip.style.top = (event.pageY - pPos.top) + 10 + 'px';
            options._tooltip.style.display = 'block';
          });
          link.addEventListener('mouseout', function(event){
            options._tooltip.style.display = 'none';
          });
          link.addEventListener('dblclick', (event) => {
            event.stopPropagation();
            let target = link.dataset.target;
            let source = link.dataset.source;
            let nodeDomList = options._container.getElementsByClassName('frog3d-node');
            if(nodeDomList){
              for(let n of nodeDomList){
                if(source == n.dataset.id || target == n.dataset.id){
                  n.style.opacity = 1;
                }else{
                  n.style.opacity = 0.3;
                }
              }
            }
            let traceDoms = options._container.getElementsByClassName('frog3d-trace');
            if(traceDoms){
              for(let t of traceDoms){
                if(t.dataset.source == source && t.dataset.target == target){
                  t.style.opacity = 1;
                }else{
                  t.style.opacity = 0.2;
                }
              }
            }
          });
        }
      }
    }
  }

  function getLineColor(line, lineOpt){
    let color = lineOpt.color??'#999999';
    if(typeof color === 'function'){
      return color(line);
    }else{
      return color;
    }
  }

  /**
   * 生成线html
   */
  function generateLink(ll, color, lineWidth, options){
    let polylinePath = "";
    for(let p of ll.path){
      polylinePath += (p[0] + "," + p[1] + " ");
    }
    // 画箭头
    let m = Math.floor(ll.path.length / 2) - 1;
    let startX = ll.path[m][0];
    let startY = ll.path[m][1];
    let endX = ll.path[m + 1][0];
    let endY = ll.path[m + 1][1];
    let midV = [(startX + endX) / 2, (startY + endY) / 2];
    let v = vectorNormalize([endX - startX, endY - startY]);
    v = [v[0] * 6, v[1] * 6]; // 拉伸6
    let v1 = vectorNormalize([startY - endY, endX - startX]);
    let v2 = vectorNormalize([endY - startY, startX - endX]);
    v1 = [v1[0] * 2, v1[1] * 2]; // 拉伸2
    v2 = [v2[0] * 2, v2[1] * 2]; // 拉伸2
    let p0 = [midV[0] + v1[0], midV[1] + v1[1]];
    let p1 = [midV[0] + v[0], midV[1] + v[1]];
    let p2 = [midV[0] + v2[0], midV[1] + v2[1]];

    let line = ll.line;

    if(options.line && options.line.label){
        options._data.innerHTML += `<span class="frog3d-trace" data-source="${line.source}" data-target="${line.target}" style="position:absolute;left:${midV[0]}px;top:${midV[1]}px;">${options.line.label(line)}</span>`;
    }

    return `<polygon class="frog3d-trace" points="${p0[0]} ${p0[1]}, ${p1[0]} ${p1[1]}, ${p2[0]} ${p2[1]}" fill="${color}" data-source="${line.source}" data-target="${line.target}"/>
      <polyline class="frog3d-trace" stroke-width="${lineWidth}" class="frog3d-link" points="${polylinePath}" stroke="${color}" fill="none" data-source="${line.source}" data-target="${line.target}"/>
      <polyline stroke-width="${lineWidth + 5}" class="frog3d-linkevent" data-id="${ll.lineId}" points="${polylinePath}" stroke="rgba(0,0,0,0)" fill="none" data-source="${line.source}" data-target="${line.target}" />`;
  }

  /**
   * 获取一个向量的单位向量
   */
  function vectorNormalize(v){
    let m = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    return [v[0] / m, v[1] / m];
  }

  /**
   * 向量变换
   */
  function vectorTransform(v, matrix){
    return [
      matrix[0][0] * v[0] + matrix[1][0] * v[1],
      matrix[0][1] * v[0] + matrix[1][1] * v[1]
    ];
  }

  /**
   * 生成点html
   */
  function generatePoint(parent, nn, options){
    let pointOpt = options.point??{};
    let nodeHtml = (pointOpt.formatter ? `${pointOpt.formatter(nn.node)}` : `<div class="frog3d-point" data-id="${nn.node.id}" style="background-color:${(pointOpt.color??'#007bff')};width:5px;height:5px;"></div>`);
    // let nodeHtml = (pointOpt.formatter ? `<div class="frog3d-nodeevent" data-id="${nn.node.id}">${pointOpt.formatter(nn.node)}` : `<div class="frog3d-nodeevent" data-id="${nn.node.id}" style="background-color:${(pointOpt.color??'#007bff')};width:5px;height:5px;">`);
    if(pointOpt.label){
      let location = '';
      if(pointOpt.label.left){
        location += `left:${pointOpt.label.left}px;`;
      }
      if(pointOpt.label.right){
        location += `right:${pointOpt.label.right}px;`;
      }
      if(pointOpt.label.top){
        location += `top:${pointOpt.label.top}px;`;
      }
      if(pointOpt.label.bottom){
        location += `bottom:${pointOpt.label.bottom}px;`;
      }
      nodeHtml += `<div style="position:absolute;${location}">${pointOpt.label.build(nn.node)}</div>`;
    }
    parent.innerHTML += `<div class="frog3d-node" data-id="${nn.node.id}" style="position:absolute;left: ${nn.x}px; top: ${nn.y}px;width:0px;height:10px;">
            ${nodeHtml}
            </div>
        `;
  }

  /**
   * 绘制
   */
  function draw(options, data){
    let obj = layout(options, data, data.dstId);
    insertHtml(options, obj.nodeList, obj.linkList);
  }

  /**
   * 计算点线位置
   */
  function layout(options, topo, dstId){
    let nodeList = calculateNode(options, topo, dstId);
    let linkList = nodeLink(options, topo, nodeList); // 计算节点连线坐标
    threeDimensionLize(options, nodeList, linkList); // 将坐标进行3维转换
    positionFix(options, nodeList, linkList); // 位置修正
    return {
      nodeList: nodeList,
      linkList: linkList
    };
  }

  /**
   * 计算点位置
   */
  function calculateNode(options, topo, dstId){
    // 确定终点id集合
    let dstIds = new Array();
    let sourceIdToTargetIdList = new Map();
    for(let line of topo.lines){
      let list = sourceIdToTargetIdList.get(line.source);
      if(!list){
        list = new Array()
        sourceIdToTargetIdList.set(line.source, list);
      }
      list.push(line.target);
    }

    for(let line of topo.lines){
      if(!sourceIdToTargetIdList.has(line.target)){
        if(dstIds.indexOf(line.target) < 0){
          dstIds.push(line.target);
        }
      }
    }
    if(dstId){
      dstIds.push(dstId);
    }
    if(dstIds.length == 0){ // 说明有环
      let ddId = null;
      let dstSize = Number.MAX_SAFE_INTEGER;
      for(let entry of sourceIdToTargetIdList.entries()){
        if(entry[1].length < dstSize){
          ddId = entry[0];
          dstSize = entry[1].length;
        }
      }
      dstIds.push(ddId);
    }

    // 梳理节点层级结构
    let loopThreshold = topo.nodes.length * 1000;
    let tree = new Array();
    tree.push(dstIds)

    let historySet = new Array();
    historySet = historySet.concat(dstIds);

    // 从终点向前
    let loop = loopThreshold;
    for(; loop > 0; loop--){
      let tmpArr = new Array();
      let first = tree[0];
      for(let dst of first){
        for(let line of topo.lines){
          if(dst == line.target && historySet.indexOf(line.source) < 0){
            historySet.push(line.source);
            tmpArr.push(line.source);
          }
        }
      }
      if(tmpArr.length == 0){ break; }
      tree.unshift(tmpArr);
    }

    if(loop == 0){
      console.warn("detect dead loop on tree build first step");
    }

    let srcIdSet = new Array();
    srcIdSet = srcIdSet.concat(tree[0]);
    let index = 0;
    loop = loopThreshold;
    // 从前向后
    for(; loop > 0; loop--){
      let tmpArr = new Array();
      for(let line of topo.lines){
        if(srcIdSet.indexOf(line.source) >= 0 && historySet.indexOf(line.target) < 0){
          historySet.push(line.target);
          tmpArr.push(line.target);
        }
      }
      index++;
      if(tmpArr.length == 0){
        if(index < tree.length){
          srcIdSet = new Array().concat(tree[index]);
        }else{
          break;
        }
      }else{
        let arr = null;
        if(index < tree.length){
          arr = tree[index];
        }else{
          arr = new Array();
          tree.push(arr);
        }
        for(let i = 0; i < tmpArr.length; i++){
            arr.push(tmpArr[i]);
        }
        tree[index] = arr;
        srcIdSet = new Array().concat(arr);
      }
    }
    if(loop == 0){
      console.warn("detect dead loop on tree build second step");
    }

    // 生成坐标前准备, 构造节点id映射
    let nodeIdToNode = new Map();
    let nodeList = [];
    for(let node of topo.nodes){
      let nn = {
        node: node
      };
      nodeList.push(nn);
      nodeIdToNode.set(node.id, nn);
    }

    let align = true; // 是否启用对齐
    let idMap = new Map();
    if(align){
        for(let line of topo.lines){
            let tList = idMap.get(line.target);
            if(!tList){
                tList = new Array();
                idMap.set(line.target, tList);
            }
            if(tList.indexOf(line.source) < 0){ tList.push(line.source); }
    
            let sList = idMap.get(line.source);
            if(!sList){
                sList = new Array();
                idMap.set(line.source, sList);
            }
            if(sList.indexOf(line.target) < 0){ sList.push(line.target); }
        }
    }

    // 按层次生成坐标
    let pointOpt = options.point??{};
    let minGap = pointOpt.minGap??100; //点与点之间的最小间隔
    let x = 0;
    let maxX = Number.MIN_SAFE_INTEGER;
    let maxY = Number.MIN_SAFE_INTEGER;
    for(let i = 0; i < tree.length; i++){
      let layer = tree[i];
      let y = 0 - layer.length / 2 * minGap;
      let standardY = y;

      // 对齐准备数据
      let c2p = new Map(); // current --> parent
      if(align){
        let parentLayer = i > 0 ? tree[i - 1] : new Array();
        for(let c of layer){
          let ll = idMap.get(c);
          if(ll){
            let list = c2p.get(c);
            if(!list){
                list = new Array();
                c2p.set(c, list);;
            }
            for(let l of ll){
                if(parentLayer.indexOf(l) >= 0 && list.indexOf(l) < 0){
                    list.push(l);
                }
            }
          }
        }
      }
      let lastY = y;
      if(align && i > 0){
        let l = tree[i - 1];
        if(l.length > 0){
            let n = nodeIdToNode.get(l[0]);
            if(n && ('y' in n)){
                lastY = Math.min(lastY, n.y);
            }
        }
      }
      lastY = lastY - minGap;
      
      for(let id of layer){
        let node = nodeIdToNode.get(id);
        if(node != null){
          if(align){  // 与上一级节点进行对齐
            let ll = c2p.get(id);
            if(ll && ll.length > 0){
                let minY = Number.MAX_SAFE_INTEGER;
                let maxY = Number.MIN_SAFE_INTEGER;
                for(let l of ll){
                    let n = nodeIdToNode.get(l);
                    if(n && ('y' in n)){
                        minY = Math.min(minY, n.y);
                        maxY = Math.max(maxY, n.y);
                    }
                }
                let iy = (minY + maxY) / 2;
                // if(iy <= standardY && iy >= lastY + minGap){
                if(iy <= standardY && iy >= lastY + minGap){
                    y = iy;
                }
            }
          }

          node.x = x;
          node.y = y;
          maxX = Math.max(x, maxX);
          maxY = Math.max(y, maxY);
          lastY = y;
          y += minGap;
          standardY += minGap;
        }
      }
      x += minGap;
    }

    // 对没有连线的孤点进行坐标生成
    let tx = maxX + minGap;
    let ty = maxY + minGap;
    for(let node of nodeList){
      if('x' in node && 'y' in node){
        continue;
      }
      node.x = tx;
      node.y = ty;
      tx += minGap;
    }
    return nodeList;
  }

  // 生成节点的连接线坐标
  function nodeLink(options, topo, nodeList){
    let idToNode = new Map();
    for(let nn of nodeList){
      idToNode.set(nn.node.id, nn);
    }

    let lineOpt = options.line??{};
    let incr = lineOpt.minGap??30;

    let lineId = 0;
    /*
     * link : {
     *    line: line,
     *    lineId: lineId,
     *    path: [
     *       [1, 2]
     *       [2, 3],
     *       ...
     *    ]
     * }
     */
    let links = new Array();
    let maxY = Number.MIN_SAFE_INTEGER;
    let minY = Number.MAX_SAFE_INTEGER;
    for(let line of topo.lines){
      let source = idToNode.get(line.source);
      let target = idToNode.get(line.target);
      if(source && target) {
        if(source.x == target.x){ // 竖直线
          if(source.y == target.y){ // 自指
            let link = {
              lineId : lineId,
              line: line,
              path: []
            };
            links.push(link);
            link.path.push([source.x, source.y]);
            link.path.push([source.x + incr, source.y]);
            link.path.push([source.x + incr, source.y - incr]);
            link.path.push([source.x, source.y - incr]);
            link.path.push([source.x, source.y]);
            maxY = Math.max(source.y, maxY);
            minY = Math.min(source.y, minY);
          }else{
            let link = {
              lineId : lineId,
              line: line,
              path: []
            };
            links.push(link);
            link.path.push([source.x, source.y]);
            link.path.push([target.x, target.y]);
            maxY = Math.max(source.y, target.y, maxY);
            minY = Math.min(source.y, target.y, minY);
          }
        }else if(source.x < target.x){ // 向后指的线
          if(source.y == target.y){ // 水平线
            let link = {
              lineId : lineId,
              line: line,
              path: []
            };
            links.push(link);
            link.path.push([source.x, source.y]);
            link.path.push([target.x, target.y]);
            maxY = Math.max(source.y, maxY);
            minY = Math.min(source.y, minY);
          }else{ // 向后的折线
            let width = target.x - source.x;
            let midX = source.x + width / 2;
            let link = {
              lineId : lineId,
              line: line,
              path: []
            };
            links.push(link);
            link.path.push([source.x, source.y]);
            link.path.push([midX, source.y]);
            link.path.push([midX, target.y]);
            link.path.push([target.x, target.y]);
            maxY = Math.max(source.y, target.y, maxY);
            minY = Math.min(source.y, target.y, minY);
          }
        }else{
          // 向前指的线, 先不处理
        }
        lineId++;
      }
    }

    let externalOffsetDown = incr; // 反向线向外偏移的量
    let externalOffsetUp = incr; // 反向线向外偏移的量
    let f = 0;
    for(let line of topo.lines){ // 对反向的线进行处理
      let source = idToNode.get(line.source);
      let target = idToNode.get(line.target);
      if(source && target) {
        if(source.x > target.x){
          let yOffsetForSourceUp = source.y - (minY - externalOffsetUp);
          let yOffsetForTargetUp = target.y - (minY - externalOffsetUp);
          let upLen = externalOffsetUp + yOffsetForSourceUp + (source.x + externalOffsetUp - target.x + externalOffsetUp) + yOffsetForTargetUp + externalOffsetUp;
          
          let yOffsetForSourceDown = maxY + externalOffsetDown - source.y;
          let yOffsetForTargetDown = maxY + externalOffsetDown - target.y;
          let downLen = externalOffsetDown + yOffsetForSourceDown + (source.x + externalOffsetDown - target.x + externalOffsetDown) + yOffsetForTargetDown + externalOffsetDown;


          let link = {
            lineId : lineId,
            line: line,
            path: []
          };
          links.push(link);
          if(downLen > upLen){ // 寻找最短路径
            link.path.push([source.x, source.y]);
            link.path.push([source.x + externalOffsetUp, source.y]);
            link.path.push([source.x + externalOffsetUp, source.y - yOffsetForSourceUp]);
            link.path.push([target.x - externalOffsetUp, target.y - yOffsetForTargetUp]);
            link.path.push([target.x - externalOffsetUp, target.y]);
            link.path.push([target.x, target.y]);
            externalOffsetUp += incr;
          }else{
            link.path.push([source.x, source.y]);
            link.path.push([source.x + externalOffsetDown, source.y]);
            link.path.push([source.x + externalOffsetDown, source.y + yOffsetForSourceDown]);
            link.path.push([target.x - externalOffsetDown, target.y + yOffsetForTargetDown]);
            link.path.push([target.x - externalOffsetDown, target.y]);
            link.path.push([target.x, target.y]);
            externalOffsetDown += incr;
          }
          f++;
          lineId++;
        }
      }
    }

    return links;
  }

  /**
   * 使用矩阵进行坐标3维化
   */
  function threeDimensionLize(options, nodeList, linkList){
    let matrix = [
      [1, 0], // 列向量1
      [0, 1] // 列向量2
    ];
    if(options.transformMatrix){
      matrix = options.transformMatrix;
    }
    for(let node of nodeList){
      let x = node.x;
      let y = node.y;
      node.x = matrix[0][0] * x + matrix[1][0] * y;
      node.y = matrix[0][1] * x + matrix[1][1] * y;
    }

    for(let link of linkList){
      for(let p of link.path){
        let x = p[0];
        let y = p[1];
        p[0] = matrix[0][0] * x + matrix[1][0] * y;
        p[1] = matrix[0][1] * x + matrix[1][1] * y;
      }
    }
  }

  /**
   * 位置修正, 防止出现负值
   */
  function positionFix(options, nodeList, linkList){
    let minX = Number.MAX_SAFE_INTEGER;
    let minY = Number.MAX_SAFE_INTEGER;
    for(let n of nodeList){
      minX = Math.min(n.x, minX);
      minY = Math.min(n.y, minY);
    }
    for(let l of linkList){
      for(let p of l.path){
        minX = Math.min(p[0], minX);
        minY = Math.min(p[1], minY);
      }
    }

    let offsetX = minX < 0 ? -minX : 0;
    let offsetY = minY < 0 ? -minY : 0;
    for(let node of nodeList){
      node.x += offsetX;
      node.y += offsetY;
    }
    for(let link of linkList){
      for(let p of link.path){
        p[0] += offsetX;
        p[1] += offsetY;
      }
    }
  }

  let frogObj = {};
  frogObj.options = options;
  frogObj.load = function(data){
    draw(frogObj.options, data);
  }
  init(frogObj.options);
  
  return frogObj;
}


/*
Demo:

var frog3d = frogFake3d({
    domId: 'canvasDiv',
    transformMatrix: [
    [1, 0.575], // 列向量1
    [-0.875, 0.5] // 列向量2
    ],
    offset:{ // 坐标整体偏移
    x: 0,
    y: 80
    },
    grid: {
    gap: 40, // 网格线间隔
    lineColor: 'rgb(153, 153, 153)', // 网格线颜色
    width: 1, // 线宽
    backgroundColor: 'rgba(0,0,0,0)',
    type: 'dotted' // solid - 实线; dashed - 虚线; dotted - 点
    },
    line: {
    color: 'red',
    width: 1,
    type: 'solid' // solid - 实线; dashed - 虚线; dotted - 点
    },
    point: {
    color: 'grey', // 点颜色
    formatter: function(node){
        return '<div style="display:flex; position:relative;">'
        + '<img style="position:absolute;left:-50px;top:-70px;width:100px;" src="'+node.icon+'">'
        +'</div>';
    }
    }
});
frog3d.load({
    dstId: '1', // 可选, 用于指定强制使用这个节点作为最末位的节点
    nodes: [
        {
            id: "1",
            icon: 'xxx.png'
        },
        {
            id: "2",
            icon: 'xxx.png'
        },
        {
            id: "3",
            icon: 'xxx.png'
        }
    ],
    lines: [
        {
            source: "1",
            target: "2"
        },
        {
            source: "2",
            target: "3"
        }
    ]
});
 */