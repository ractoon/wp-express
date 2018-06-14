var ProjectsBox = React.createClass({
  getInitialState: function() {
    return {data: []};
  },
  componentDidMount: function() {
    var projects = new wpeProjects();
    projects.init();

    this.setState({data: projects.list()});
  },
  render: function() {
    return (
    <div className="projectsBox">
      <h4>Projects</h4>
      <ProjectsList data={this.state.data} />
      <a className="add-project" href="#"><i className="fa fa-plus"></i> Add Project</a>
    </div>
    );
  }
});

var ProjectsList = React.createClass({
  getInitialState: function() {
    return { active: -1 };
  },
  handleClick: function(e, index) {
    e.preventDefault();
    alert('clicked');
    this.setState({ active: index });
  },
  render: function() {
    var projectNodes = this.props.data.map(function(project, index) {
      var boundClick = this.handleClick.bind(this, index);

      return (
        <Project onClick={boundClick} active={this.state.active == index}>
          {project.name}
        </Project>
      );
    }, this);
    return (
      <div className="list-group">
        {projectNodes}
      </div>
    );
  }
});

var Project = React.createClass({
  render: function() {
    var cx = React.addons.classSet;
    var classes = cx({
      'list-group-item': true,
      'active': this.props.active
    });

    return (
      <a href="#" onClick={this.props.handleClick} className={classes}>
        {this.props.children}
      </a>
    );
  }
});

React.render(
  <ProjectsBox url="projects.json" pollInterval={2000} />,
  document.getElementById('projects')
);