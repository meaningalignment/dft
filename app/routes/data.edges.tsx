import * as d3 from 'd3';
import { useLoaderData } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import ValuesCard from "~/components/values-card";
import { loader as edgesLoader } from './data.edges[.]json.js'

export async function loader() {
  return await edgesLoader()
}

interface Node {
  id: number;
  title: string;
}

interface Link {
  source: number;
  target: number;
}

function InfoBox({ node, x, y }: { node: Node | null, x: number, y: number }) {
  if (!node) return null;
  const style = {
    position: 'absolute',
    left: x,
    top: y,
    pointerEvents: 'none',
  };
  return (
    <div className="info-box" style={style}>
      <ValuesCard card={node} />
    </div>
  );
};

export default function Graph() {
  let hoverTimeout: NodeJS.Timeout | null = null;
  const ref = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [position, setPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const { nodes, links } = useLoaderData<typeof loader>();

  useEffect(() => {
    const svg = d3.select(ref.current)
      .attr('width', '100%')  // Full-screen width
      .attr('height', '100vh');  // Full-screen height

    svg.selectAll("g > *").remove();
    const g = svg.append('g');

    // Define arrow markers
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .enter().append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 27)  // Adjust position for bigger arrowhead
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 8)  // Increase size
      .attr("markerHeight", 8)  // Increase size
      .attr("xoverflow", "visible")
      .append("svg:path")
      .attr("d", "M 0,-5 L 10,0 L 0,5")
      .attr('fill', '#000');

    // Add zoom behavior
    const zoom = d3.zoom()
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Create force simulation
    const simulation = d3.forceSimulation<Node, Link>(nodes)
      .force('link', d3.forceLink<Link, Node>(links).id((d: Node) => d.id).distance(50))
      .force('charge', d3.forceManyBody().strength(-50))  // Weaker repulsion within groups
      .force('center', d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2).strength(0.05));  // Weaker central pull

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'black')
      .attr('marker-end', 'url(#arrowhead)');  // Add arrowheads

    // Draw edge labels
    const edgeLabels = g.append('g')
      .selectAll('text')
      .data(links)
      .enter().append('text')
      .attr('font-size', '8px')
      .attr('fill', '#cccccc')
      .attr('text-anchor', 'middle')
      .attr('dy', -5);

    // Draw nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 10)
      .attr('fill', 'blue')
      .on('mouseover', (event: any, d: Node) => {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        setHoveredNode(d);
        setPosition({ x: event.clientX, y: event.clientY });
      })
      .on('mouseout', () => {
        hoverTimeout = setTimeout(() => {
          setHoveredNode(null);
        }, 200);  // 200 milliseconds delay
      })
      .call(d3.drag()  // Make nodes draggable
        .on('start', dragStart)
        .on('drag', dragging)
        .on('end', dragEnd));

    // Draw labels
    const label = g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text((d: Node) => d.title)
      .attr('font-size', '10px');

    // Update positions
    simulation.on('tick', () => {
      link.attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      edgeLabels.attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2)
        .text((d: any) => d.avg.toFixed(3));

      node.attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      label.attr('x', (d: any) => d.x + 10)
        .attr('y', (d: any) => d.y + 3);
    });

    // Drag functions
    function dragStart(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragging(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnd(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }, [nodes, links]);

  return (
    <>
      <svg ref={ref} style={{ userSelect: "none" }}>
        <g></g>
      </svg>
      <InfoBox node={hoveredNode} x={position.x} y={position.y} />
    </>
  );
};
