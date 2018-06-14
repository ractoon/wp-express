<?php
error_reporting(0);

class WPAPI {

	protected $options;

  public function __construct() {
  	// config options
  	$shortopts = "";

  	$longopts = array(
      "run:",
		  "page::",
		  "per_page::",
      "search:",
      "locale::"
		);

  	$this->options = getopt($shortopts, $longopts);

    // defaults
    if (empty($this->options['per_page'])) {
      $this->options['per_page'] = 7;
    } 

    if (empty($this->options['page'])) {
      $this->options['page'] = 1;
    }

  	// get method to run
  	$method = $this->options['run'];

  	if (method_exists($this, $method)) {
  		return $this->$method();
  	}
  }

  public function getThemes() {
    $params = (object) array(
      'per_page'  => $this->options['per_page'],
      'page'      => $this->options['page'],
      'search'    => $this->options['search'],
      'fields'    => array(
        'ratings'     => false,
        'description' => false,
        'homepage'    => false
      )
    );

    if (!empty($this->options['locale'])) {
      $params->locale = $this->options['locale'];
    }

    $url = 'https://api.wordpress.org/themes/info/1.0/';

    $fields = array(
      'action' => 'query_themes',
      'request' => serialize($params)
    );

    echo $this->sendRequest($url, $fields);
  }

  public function getPlugins() {    
    $params = (object) array(
      'per_page'  => $this->options['per_page'],
      'page'      => $this->options['page'],
      'search'    => $this->options['search'],
      'fields'    => array(
        'ratings'     => false,
        'description' => false,
        'homepage'    => false
      )
    );

    if (!empty($this->options['locale'])) {
      $params->locale = $this->options['locale'];
    }

    $url = 'https://api.wordpress.org/plugins/info/1.0/';

    $fields = array(
      'action' => 'query_plugins',
      'request' => serialize($params)
    );

    echo $this->sendRequest($url, $fields);
  }

  protected function sendRequest($url, $fields) {
    // url-ify the data for the POST
    $fields_string = '';
    foreach($fields as $key => $value) { $fields_string .= $key.'='.$value.'&'; }
    $fields_string = rtrim($fields_string, '&');

    // open connection
    $ch = curl_init();

    //set the url, number of POST vars, POST data
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, count($fields));
    curl_setopt($ch, CURLOPT_POSTFIELDS, $fields_string);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);

    //execute post
    $result = curl_exec($ch);

    //close connection
    curl_close($ch);

    return json_encode(unserialize($result));
  }

  public function test() {
  	var_dump($this->options);
  }
}

$wpapi = new WPAPI();