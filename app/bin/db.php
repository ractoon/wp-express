<?php
error_reporting(0);

class DB {

	protected $options;
	protected $conn;

  public function __construct() {
  	// config options
  	$shortopts = "";

  	$longopts = array(
		"run:",
		"user:",
		"pass:",
		"host:",
		"db::",
		"charset::",
		"collate::",
		"search::"
	);

  	$this->options = getopt($shortopts, $longopts);

  	// establish connection
  	$this->conn = new mysqli($this->options['host'], $this->options['user'], $this->options['pass']);

  	if ($this->conn->connect_errno) {
  		echo json_encode(array(
  			'status' 	=> 'error',
  			'message'	=> $this->conn->connect_error
  		));

	    exit();
  	}

  	// select database if applicable
  	if (!empty($this->options['db'])) {
  		$this->conn->select_db($this->options['db']);
  	}

  	// get method to run
  	$method = $this->options['run'];

  	if (method_exists($this, $method)) {
  		return $this->$method();
  	}
  }

  function __destruct() {
  	$this->conn->close();
  }

  public function query($query) {
  	if ($sth = $this->conn->query($query)) {
  		$rows = array();

  		while($r = $sth->fetch_assoc()) {
  			$rows[] = $r;
  		}

  		echo json_encode(array(
  			'status'	=> 'success',
  			'data' 		=> $rows
  		));

  		$sth->free();
  	}
  }

  public function createDatabase() {
  	if (empty($this->options['charset'])) $this->options['charset'] = 'utf8';
  	if (empty($this->options['collate'])) $this->options['collate'] = 'utf8_general_ci';

  	if ($this->conn->query("CREATE DATABASE IF NOT EXISTS " . $this->options['db'] . " DEFAULT CHARACTER SET = " . $this->options['charset'] . " DEFAULT COLLATE = " . $this->options['collate'])) {
  		echo json_encode(array(
  			'status' 	=> 'success'
  		));
  	}
  	else {
  		echo json_encode(array(
  			'status' 	=> 'error',
  			'message'	=> $this->conn->error
  		));
  	}
  }

  public function listDatabases() {
  	$this->query("SHOW DATABASES");
  }

  public function listCharacterSets() {
  	$this->query("SHOW CHARACTER SET");
  }

  public function listCollations() {
  	$this->query("SHOW COLLATION LIKE '" . $this->options['search'] . "%'");
  }

  public function findTables() {
  	$this->query("SHOW TABLES LIKE '" . str_replace( '_', '\_', $this->options['search'] ) . "%'");
  }

  public function test() {
  	var_dump($this->options);
  }
}

$db = new DB();