import React, { Component } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';
import moment from 'moment';
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';

export default class WorkDays extends Component {
	constructor(props) {
		super(props);
		this.margin = {
			top: 5,
			right: 5,
			bottom: 5,
			left: 5
		};

		this.width = 280 - this.margin.left - this.margin.right;
		this.height = 280 - this.margin.bottom - this.margin.top;
		this.alpha = 5;
		this.innerCircle = 45;
		this.arcWidth = (this.height / 2 - this.innerCircle) / 6;
		this.chartRadius = this.innerCircle + this.arcWidth * 5;
		this.cornerRadius = 20;
		this.angleScale = d3.scaleLinear().domain([ 0, 24 ]).range([ 0, 2 * Math.PI ]);
		this.colorScale = d3.scaleSequential(d3['interpolatePlasma']).domain([ 5, -3 ]);

		this.svg = null;
		this.data = null;
	}

	state = {
		weekNumber: 1,
		minWeek: 1,
		maxWeek: 52
	};

	onChange = (e) => {
		this.setState(
			{
				weekNumber: e.target.value
			},
			() => {
				this.changeWeek();
			}
		);
	};

	arc(start) {
		return d3
			.arc()
			.innerRadius((d, i) => 2 + i * this.arcWidth + this.innerCircle)
			.outerRadius((d, i) => i * this.arcWidth + this.arcWidth + this.innerCircle)
			.cornerRadius(this.cornerRadius)
			.startAngle((d, i) => this.angleScale(start))
			.endAngle((d, i) => this.angleScale(d));
	}

	componentDidMount() {
		this.buildChart();
		this.drawChart();
	}

	componentDidUpdate(prevProps, prevState) {
		if (this.props.data !== prevProps.data) {
			this.setState(
				{
					minWeek: _.minBy(this.props.data, (d) => {
						return d.week_of_year;
					}).week_of_year,
					maxWeek: _.maxBy(this.props.data, (d) => {
						return d.week_of_year;
					}).week_of_year,
					weekNumber: _.minBy(this.props.data, (d) => {
						return d.week_of_year;
					}).week_of_year
				},
				() => {
					this.drawChart();
				}
			);
		}
	}

	buildChart = () => {
		this.svg = d3
			.select(this.ref)
			.append('svg')
			.attr('width', this.width + this.margin.left + this.margin.right)
			.attr('height', this.height + this.margin.top + this.margin.bottom)
			.append('g')
			.attr(
				'transform',
				'translate(' + [ this.margin.left + this.width / 2, this.margin.top + this.height / 2 ] + ')'
			);

		const ticks = this.angleScale.ticks(10).slice(0, -1);

		const axialAxis = this.svg
			.append('g')
			.attr('class', 'a axis')
			.selectAll('g')
			.data(ticks)
			.enter()
			.append('g')
			.attr('transform', (d) => 'rotate(' + (this.radiansToDegrees(this.angleScale(d)) - 90) + ')');

		axialAxis.append('line').attr('x1', this.height / 5).attr('x2', this.chartRadius);

		axialAxis.append('text').attr('x', this.chartRadius + 5).style('font-size', '12px').text((d) => d);

		// Background bars
		this.svg
			.append('g')
			.selectAll('path')
			.data([ 1, 2, 3, 4, 5 ])
			.enter()
			.append('path')
			.attr('class', 'background bar')
			.style('fill', '#f0f0f0')
			.attr(
				'd',
				d3
					.arc()
					.innerRadius((d, i) => i * this.arcWidth + this.innerCircle)
					.outerRadius((d, i) => i * this.arcWidth + this.arcWidth + this.innerCircle)
					.cornerRadius(this.cornerRadius)
					.startAngle((d, i) => this.angleScale(0))
					.endAngle((d, i) => this.angleScale(24))
			);

		this.svg
			.append('text')
			.attr('class', 'week_number')
			.attr('x', 0)
			.attr('y', 0)
			.attr('text-anchor', 'middle')
			.text('Week 0');
	};

	drawChart = () => {
		this.data = this.props.data;
		const data = this.props.data;

		// Arcs for data
		this.svg
			.append('g')
			.attr('class', 'data')
			.selectAll('path')
			.data(
				data.filter((d) => {
					return d.week_of_year == this.state.weekNumber;
				})
			)
			.enter()
			.append('path')
			.attr('class', 'arc')
			.style('fill', (d, i) => {
				return this.colorScale(i);
			})
			.transition()
			.ease(d3.easeBounce)
			.delay((d, i) => i * 200)
			.duration(2000)
			.attrTween('d', this.arcTween);
	};

	radiansToDegrees(angle) {
		return angle * 180 / Math.PI;
	}

	arcTween = (d, i) => {
		const interpolate = d3.interpolate(d.start_hour, d.end_hour);
		return (t) => this.arc(d.start_hour)(interpolate(t), i);
	};

	changeWeek = () => {
		// Bind data to arcs
		const i = this.state.weekNumber;
		const arcs = this.svg.selectAll('.arc').data(
			this.data.filter((d) => {
				return d.week_of_year == i;
			})
		);

		this.svg.select('.week_number').text('Week ' + i);
		// Remove old arcs
		arcs.exit().remove();

		// Add new arcs
		arcs
			.enter()
			.append('path')
			.attr('class', 'arc')
			.style('fill', (d, i) => {
				return this.colorScale(i);
			})
			.transition()
			.ease(d3.easeBounce)
			.delay((d, i) => i * 200)
			.duration(2000)
			.attrTween('d', this.arcTween);

		// Update existing arcs
		arcs
			.style('fill', (d, i) => {
				return this.colorScale(i);
			})
			.transition()
			.ease(d3.easeBounce)
			.delay((d, i) => i * 200)
			.duration(2000)
			.attrTween('d', this.arcTween);
	};

	reverseWeek = () => {
		if (this.state.weekNumber > this.state.minWeek) {
			this.setState(
				{
					weekNumber: this.state.weekNumber - 1
				},
				() => {
					this.changeWeek();
				}
			);
		}
	};

	advanceWeek = () => {
		if (this.state.weekNumber < this.state.maxWeek) {
			this.setState(
				{
					weekNumber: this.state.weekNumber + 1
				},
				() => {
					this.changeWeek();
				}
			);
		}
	};

	formatWeek = (weekNumber) => {
		const start = moment().day(1).isoWeek(weekNumber).format('DD/MM');
		const end = moment().day(1).isoWeek(weekNumber + 1).format('DD/MM');
		return `${start} - ${end}`;
	};

	render() {
		return (
			<div>
				
				<div className="week-selector">
					<button onClick={this.reverseWeek} className="btn btn-week-selector">
						<IoIosArrowBack />
					</button>
					<div className="selected-week">{this.formatWeek(this.state.weekNumber)}</div>
					<button onClick={this.advanceWeek} className="btn btn-week-selector">
						<IoIosArrowForward />
					</button>
				</div>
				<div style={{'textAlign': 'center'}} ref={(el) => (this.ref = el)} />
                <div className="slider-container">
					<input
						onChange={this.onChange}
						type="range"
						min={this.state.minWeek}
						max={this.state.maxWeek}
						value={this.state.weekNumber}
						className="slider"
						step="1"
					/>
				</div>
			</div>
		);
	}
}
