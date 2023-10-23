import { useEffect, useRef, useState } from "react";
import ValuesCard from "./values-card";
import * as d3 from "d3";
import { MoralGraphSummary } from "~/values-tools/moral-graph-summary";
import { GraphSettings } from "./moral-graph-settings";
import { CanonicalValuesCard } from "@prisma/client";

function logisticFunction(n: number, midpoint: number = 6, scale: number = 2): number {
  return 1 / (1 + Math.exp(-(n - midpoint) / scale));
}

interface Node {
  id: number
  title: string
  wisdom?: number
}

interface Link {
  source: number | CanonicalValuesCard
  target: number | CanonicalValuesCard
  avg: number,
  contexts: string[],
  counts: {
    markedWiser: number
    markedNotWiser: number
    markedLessWise: number
    markedUnsure: number
    impressions: number
  },
  thickness: number
}

type MoralGraphEdge = MoralGraphSummary["edges"][0]

function NodeInfoBox({ node, x, y }: { node: Node | null; x: number; y: number }) {
  if (!node) return null

  const boxWidth = 200; // Assume a box width
  const offset = 20; // Offset from the cursor position
  const viewportWidth = window.innerWidth; // Width of the viewport

  // If the box would overflow the right edge of the viewport, 
  // position it to the left of the cursor, otherwise to the right.
  const leftPosition = x + boxWidth + offset > viewportWidth
    ? x - boxWidth - offset
    : x + offset;

  const style = {
    position: "absolute",
    left: leftPosition,
    top: y + offset,
  }

  return (
    <div className="info-box z-50" style={style as any}>
      <ValuesCard card={node as any} inlineDetails />
    </div>
  )
}

function LinkInfoBox({ link, x, y }: { link: Link | null; x: number; y: number }) {
  if (!link) return null

  const boxWidth = 200; // Assume a box width
  const offset = 20; // Offset from the cursor position
  const viewportWidth = window.innerWidth; // Width of the viewport

  // If the box would overflow the right edge of the viewport, 
  // position it to the left of the cursor, otherwise to the right.
  const leftPosition = x + boxWidth + offset > viewportWidth
    ? x - boxWidth - offset
    : x + offset;

  const style = {
    position: "absolute",
    left: leftPosition,
    top: y + offset,
  }

  function formatCount(count: number) {
    return `${count} participant${count > 1 || count === 0 ? "s" : ""}`
  }

  return (
    <div className="info-box z-50" style={style as any}>
      <div className="border-2 border-gray-200 rounded-xl px-8 py-4 max-w-sm bg-white flex flex-col">
        <p className="text-sm font-semibold text-gray-400 mb-1">{link.contexts.join(", ")}</p>
        <p className="text-base mb-6">
          Is it wiser to follow <em className="font-semibold">{(link.target as CanonicalValuesCard).title}</em> rather than <em className="font-semibold">{(link.source as CanonicalValuesCard).title}</em>?
        </p>
        <div className="flex justify-between">
          <p className="font-bold">Wiser</p>
          <p className="text-gray-400">{formatCount(link.counts.markedWiser)}</p>
        </div>
        <div className="flex justify-between">
          <p className="font-bold">Not Wiser</p>
          <p className="text-gray-400">{formatCount(link.counts.markedNotWiser)}</p>
        </div>
        {link.counts.markedLessWise > 0 && (
          <div className="flex justify-between">
            <p className="font-bold">Less Wise</p>
            <p className="text-gray-400">{formatCount(link.counts.markedLessWise)}</p>
          </div>
        )}
        <div className="flex justify-between">
          <p className="font-bold">Unsure</p>
          <p className="text-gray-400">{formatCount(link.counts.markedUnsure)}</p>
        </div>
      </div>
    </div>
  );
}


export function MoralGraph({ nodes, edges, settings }: { nodes: Node[]; edges: MoralGraphEdge[], settings: GraphSettings }) {
  const newNodes = [...nodes]
  const { visualizeWisdomScore, visualizeEdgeCertainty } = settings

  const links = edges.map((edge) => ({
    source: edge.sourceValueId,
    target: edge.wiserValueId,
    avg: edge.summary.wiserLikelihood,
    counts: edge.counts,
    contexts: edge.contexts,
    thickness: visualizeEdgeCertainty ? (1 - edge.summary.entropy / 1.8) * logisticFunction(edge.counts.impressions) : 0.5,
  })) satisfies Link[]

  if (visualizeWisdomScore) {
    links.forEach((link) => {
      const target = newNodes.find((node) => node.id === link.target)
      if (target) {
        if (!target.wisdom) target.wisdom = link.avg
        else target.wisdom += link.avg
      }
    })
  }
  return <GraphWithInfoBox nodes={newNodes} links={links} />
}

function GraphWithInfoBox({ nodes, links }: { nodes: Node[]; links: Link[] }) {
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null)
  const [hoveredLink, setHoveredLink] = useState<Link | null>(null);

  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  })

  return (
    <>
      <Graph nodes={nodes} links={links} setHoveredNode={setHoveredNode} setHoveredLink={setHoveredLink} setPosition={setPosition} />
      <NodeInfoBox node={hoveredNode} x={position.x} y={position.y} />
      <LinkInfoBox link={hoveredLink} x={position.x} y={position.y} />
    </>
  )
}

function Graph({ nodes, links, setHoveredNode, setHoveredLink, setPosition }: { nodes: Node[]; links: Link[], setHoveredNode: (node: Node | null) => void, setHoveredLink: (link: Link | null) => void, setPosition: (position: { x: number; y: number }) => void }) {
  let hoverTimeout: NodeJS.Timeout | null = null
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const svg = d3
      .select(ref.current)
      .attr("width", "100%") // Full-screen width
      .attr("height", "100vh") // Full-screen height
      .attr("zoom", "1")

    svg.selectAll("g > *").remove()
    const g = svg.append("g")

    // Define arrow markers
    svg
      .append("defs")
      .selectAll("marker")
      .data(["end"])
      .enter()
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20) // Adjust position for bigger arrowhead
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 4) // Increase size
      .attr("markerHeight", 4) // Increase size
      .attr("xoverflow", "visible")
      .append("svg:path")
      .attr("d", "M 0,-5 L 10,0 L 0,5")

    // Add zoom behavior
    const zoom = d3.zoom().on("zoom", (event) => {
      g.attr("transform", event.transform)
    })
    // @ts-ignore
    svg.call(zoom)

    // Create force simulation
    const simulation = d3
      // @ts-ignore
      .forceSimulation<Node, Link>(nodes)
      .force(
        "link",
        // @ts-ignore
        d3
          // @ts-ignore
          .forceLink<Link, Node>(links)
          // @ts-ignore
          .id((d: Node) => d.id)
          .distance(120)
      )
      // @ts-ignore
      .force(
        "charge",
        // @ts-ignore
        d3
          .forceManyBody().strength(-50)

      ) // Weaker repulsion within groups
      .force(
        "center",
        // @ts-ignore
        d3
          .forceCenter(window.innerWidth / 2, window.innerHeight / 2)
          .strength(0.05)
      ) // Weaker central pull

    // Draw links
    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d: Link) => {
        return d3.interpolateGreys(d.thickness * 5)
      })
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrowhead)") // Add arrowheads
      .on("mouseover", (event: any, d: Link) => {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        setHoveredLink(d);
        setHoveredNode(null)
        setPosition({ x: event.clientX, y: event.clientY });
      })
      .on("mouseout", () => {
        hoverTimeout = setTimeout(() => {
          setHoveredLink(null);
        }, 200); // 200 milliseconds delay
      });

    // Draw edge labels
    const edgeLabels = g
      .append("g")
      .selectAll("text")
      .data(links)
      .enter()
      .append("text")
      .attr("font-size", "8px")
      .attr("fill", "#cccccc")
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .on("mouseover", (event: any, d: Link) => {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        setHoveredLink(d);
        setHoveredNode(null)
        setPosition({ x: event.clientX, y: event.clientY });
      })
      .on("mouseout", () => {
        hoverTimeout = setTimeout(() => {
          setHoveredLink(null);
        }, 200); // 200 milliseconds delay
      });

    // Draw nodes
    const node = g
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 10)
      .attr("fill", (d: Node) => (d.wisdom ?
        d3.interpolateBlues(d.wisdom / 5) :
        "lightgray"
      ))
      .on("mouseover", (event: any, d: Node) => {
        if (hoverTimeout) clearTimeout(hoverTimeout)
        setHoveredNode(d)
        setHoveredLink(null)
        setPosition({ x: event.clientX, y: event.clientY })
      })
      .on("mouseout", () => {
        hoverTimeout = setTimeout(() => {
          setHoveredNode(null)
        }, 200) // 200 milliseconds delay
      })
      .call(
        // @ts-ignore
        d3
          .drag() // Make nodes draggable
          .on("start", dragStart)
          .on("drag", dragging)
          .on("end", dragEnd)
      )

    // Draw labels
    const label = g
      .append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d: Node) => d.title)
      .attr("font-size", "10px")

    // Update positions
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)

      edgeLabels
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2)
        .text((d: any) => d.avg.toFixed(3))

      node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y)

      label.attr("x", (d: any) => d.x + 15).attr("y", (d: any) => d.y + 4)
    })

    // Drag functions
    function dragStart(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragging(event: any, d: any) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragEnd(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }
  }, [nodes, links])
  return <svg ref={ref} style={{ userSelect: "none" }}>
    <g></g>
  </svg>
}