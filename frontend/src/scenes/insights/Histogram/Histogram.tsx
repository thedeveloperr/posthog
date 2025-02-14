import React from 'react'
import * as d3 from 'd3'
import { D3Selector, useD3, getOrCreateEl, animate, D3Transition } from 'lib/hooks/useD3'
import { FunnelLayout } from 'lib/constants'
import { getChartColors } from 'lib/colors'
import { getConfig, createRoundedRectPath } from './histogramUtils'

import './Histogram.scss'
import { humanFriendlyDuration } from 'lib/utils'

export interface HistogramDatum {
    id: string | number
    bin0: number
    bin1: number
    count: number
}

interface HistogramProps {
    data: HistogramDatum[]
    layout?: FunnelLayout
    color?: string
    isAnimated?: boolean
}

export function Histogram({
    data,
    layout = FunnelLayout.vertical,
    color = 'white',
    isAnimated = false,
}: HistogramProps): JSX.Element {
    const colorList = getChartColors(color)
    const isEmpty = data.length === 0 || d3.sum(data.map((d) => d.count)) === 0

    // TODO: All D3 state outside of useD3 hook will be moved into separate kea histogramLogic

    const isVertical = layout === FunnelLayout.vertical
    const config = getConfig(isVertical)

    // Initialize x-axis and y-axis scales
    const xMin = data?.[0]?.bin0 || 0
    const xMax = data?.[data.length - 1]?.bin1 || 1
    const x = d3.scaleLinear().domain([xMin, xMax]).range(config.ranges.x).nice()
    const xAxis = config.axisFn
        .x(x)
        .tickValues([...data.map((d) => d.bin0), xMax])
        // v === -2 || v === -1 represent bins that catch grouped outliers.
        // TODO: (-2, -1) are temporary placeholders for (-inf, +inf) and should be changed when backend specs are finalized
        .tickFormat((v: number) => {
            const label = humanFriendlyDuration(v)
            if (v === -2) {
                return `<${label}`
            }
            if (v === -1) {
                return `>=${label}`
            }
            return label
        })

    // y-axis scale
    const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d: HistogramDatum) => d.count) as number])
        .range(config.ranges.y)
        .nice()
    const yAxis = config.axisFn.y(y).tickSize(0)

    // y-axis gridline scale
    const yAxisGrid = config.axisFn.y(y).tickSize(-config.gridlineTickSize).tickFormat('').ticks(y.ticks().length)

    const ref = useD3(
        (container) => {
            const renderCanvas = (parentNode: D3Selector): D3Selector => {
                // Get or create svg > g
                const _svg = getOrCreateEl(parentNode, 'svg > g', () =>
                    parentNode
                        .append('svg:svg')
                        .attr('viewBox', `0 0 ${config.width} ${config.height}`)
                        .append('svg:g')
                        .classed(layout, true)
                )

                // if class doesn't exist on svg>g, layout has changed. after we learn this, reset
                // the layout
                const layoutChanged = !_svg.classed(layout)
                _svg.attr('class', null).classed(layout, true)

                // if layout changes, redraw axes from scratch
                if (layoutChanged) {
                    _svg.selectAll('#x-axis,#y-axis,#y-gridlines').remove()
                }

                // bars
                _svg.attr('fill', colorList[0])
                    .selectAll('path')
                    .data(data)
                    .join('path')
                    .call(animate, config.transitionDuration, isAnimated, (it: D3Transition) => {
                        return it.attr('d', (d: HistogramDatum) => {
                            if (isVertical) {
                                return createRoundedRectPath(
                                    x(d.bin0) + config.spacing.btwnBins / 2,
                                    y(d.count),
                                    Math.max(0, x(d.bin1) - x(d.bin0) - config.spacing.btwnBins),
                                    y(0) - y(d.count),
                                    config.borderRadius,
                                    'top'
                                )
                            }
                            // is horizontal
                            return createRoundedRectPath(
                                y(0),
                                x(d.bin0) + config.spacing.btwnBins / 2,
                                y(d.count) - y(0),
                                Math.max(0, x(d.bin1) - x(d.bin0) - config.spacing.btwnBins),
                                config.borderRadius,
                                'right'
                            )
                        })
                    })

                // x-axis
                const _xAxis = getOrCreateEl(_svg, 'g#x-axis', () =>
                    _svg.append('svg:g').attr('id', 'x-axis').attr('transform', config.transforms.x)
                )
                _xAxis.call(animate, !layoutChanged ? config.transitionDuration : 0, isAnimated, (it: D3Transition) =>
                    it.call(xAxis).attr('transform', config.transforms.x)
                )

                // Don't draw y-axis or y-gridline if the data is empty
                if (!isEmpty) {
                    // y-axis
                    const _yAxis = getOrCreateEl(_svg, 'g#y-axis', () =>
                        _svg.append('svg:g').attr('id', 'y-axis').attr('transform', config.transforms.y)
                    )
                    _yAxis.call(
                        animate,
                        !layoutChanged ? config.transitionDuration : 0,
                        isAnimated,
                        (it: D3Transition) =>
                            it
                                .call(yAxis)
                                .attr('transform', config.transforms.y)
                                .call((g) => g.selectAll('.tick text').attr('dy', `-${config.spacing.yLabel}`))
                    )

                    // y-gridlines
                    const _yGridlines = getOrCreateEl(_svg, 'g#y-gridlines', () =>
                        _svg.append('svg:g').attr('id', 'y-gridlines').attr('transform', config.transforms.yGrid)
                    )
                    _yGridlines.call(
                        animate,
                        !layoutChanged ? config.transitionDuration : 0,
                        isAnimated,
                        (it: D3Transition) =>
                            it
                                .call(yAxisGrid)
                                .call((g) =>
                                    g
                                        .selectAll('.tick:not(:first-of-type) line')
                                        .attr('stroke-opacity', 0.5)
                                        .attr('stroke-dasharray', '2,2')
                                )
                                .attr('transform', config.transforms.yGrid)
                    )
                }

                return _svg
            }

            renderCanvas(container)
        },
        [data, layout]
    )

    return <div className="histogram-container" ref={ref} />
}
