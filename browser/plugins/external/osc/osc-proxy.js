OscProxy = (function() {
	if (typeof(OscProxy) !== 'undefined')
		return OscProxy;

	var _listeners = {};
	var _state = 'disconnected';
	var wsPort = 8000;

	function connect() {
		if (_state === 'connected' || _state === 'connecting')
			return;

		_state = 'connecting';

		var ws = new WebSocket('ws://'+window.location.hostname+':'+wsPort+'/__osc-proxy');
		ws.onopen = function()
		{
			console.log('OscProxy connected');
			_state = 'connected';
		};

		ws.onclose = function()
		{
			console.warn('OscProxy disconnected!');
			_state = 'disconnected';
		};

		ws.onmessage = function(evt)
		{
			var oscMessage = JSON.parse(evt.data);

			if (_listeners[oscMessage.address])
				_listeners[oscMessage.address](oscMessage.args);

			if (_listeners['*'])
				_listeners['*'](oscMessage.address, oscMessage.args);
		};
	};

	connect();

	return {
		listen: function(address, fn)
		{
			_listeners[address] = fn;
		}
	};

})();
