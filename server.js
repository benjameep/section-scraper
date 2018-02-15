const Hapi = require('hapi')
const sections = require('./sections.json')

// Create a server with a host and port
const server = Hapi.server({
	// host: '127.0.0.1',
	port: process.env.PORT || 8000
});

server.ext('onRequest', function (request, h) {
	request.path = request.path.replace(/\/$/, '');
	return h.continue
});

// Add the route
server.route([{
	method: 'GET',
	path: '/api/v0/sections',
	handler: function (request, h) {
		return Object.keys(sections.semesters)
	}
}, {
	method: 'GET',
	path: '/api/v0/sections/{semester}',
	handler: function (request, h) {
		if(request.params.semester in sections.semesters){
			return Object.keys(sections.semesters[request.params.semester])
		} else {
			return h.response().code(404)
		}
	}
}, {
	method: 'GET',
	path: '/api/v0/sections/{semester}/{course}',
	handler: function (request, h) {
		var course = request.params.course
		if(request.params.semester in sections.semesters &&
			course in sections.semesters[request.params.semester]){
			return sections.semesters[request.params.semester][course]
		} else {
			return h.response().code(404)
		}
	}
}, {
	method: 'GET',
	path: '/api/v0/sections/{semester}/{course}/{section}',
	handler: function (request, h) {
		if(request.params.semester in sections &&
			request.params.course in sections[request.params.semester] &&
			request.params.section in sections[request.params.semester][request.params.course]){
			return sections[request.params.semester][request.params.course][request.params.section]
		} else {
			return h.response().code(404)
		}
	}
},{
	method: 'GET',
	path: '/api/v0/update/sections',
	handler: async function (request, h) {
		var howLongAgo = new Date() - new Date(sections.lastrun)
		if(howLongAgo > 1000 * 60 * 60){
			await require('./updateSections')()
			return 'done'
		} else {
			return `No it has only been ${howLongAgo/(1000*60*60)} hours`
		}
	}
}]);

// Start the server
async function start() {

	await server.start();
	console.log('Server running at:', server.info.uri);

}

start();