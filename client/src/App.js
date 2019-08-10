import React, { Component } from 'react';
import RadialChart from './components/RadialChart';
import WorkCommutes from './components/WorkCommutes';
import './scss/App.scss';
import axios from 'axios';

class App extends Component {
	state = {
		workdays: [],
		workCommutes: []
	};

	componentDidMount() {
	}

	onSubmit = (e) => {
		e.preventDefault();
		const files = e.target["files[]"].files;
		const formData = new FormData();
		for (const file of files) {
			formData.append("files[]", file);
		}
		axios.post(
			"http://localhost:5000/api/upload",
			formData,
			{
				"headers": {
					"Content-Type": "multipart/form-data"
				}
			}
		).then(response => {
			this.setState({workdays: response.data.workdays});
			this.setState({workCommutes: response.data.work_commutes});
		})
	}

	render() {
		return (
			<div className="App">
				<div className="card">
					<div className="card-title">Upload files</div>
					<form onSubmit={this.onSubmit}>
						<input
							type="file"
							name="files[]"
							multiple={true}
							required
						/>
						<input type="submit" value="Submit" className="btn"/>
					</form>
				</div>
				<div className="card">
					<div className="card-title">Work commute journeys</div>
					<WorkCommutes data={this.state.workCommutes} />
				</div>
				<div className="card">
					<div className="card-title">Hello world</div>
					<RadialChart data={this.state.workdays} />
				</div>
			</div>
		);
	}
}

export default App;
