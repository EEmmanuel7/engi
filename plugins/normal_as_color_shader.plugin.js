E2.plugins["normal_as_color_shader"] = function(core, node) {
	var self = this;
	var renderer = core.renderer; 
	var gl = renderer.context;
	
	this.input_slots = [
		 { name: 'is3d', dt: core.datatypes.BOOL },
		 { name: 'camera', dt: core.datatypes.CAMERA },
		 { name: 'transform', dt: core.datatypes.TRANSFORM }
	];
	
	this.output_slots = [ 
		{ name: 'shader', dt: core.datatypes.SHADER } 
	];
	
	var vs_src = 'attribute vec3 pos;'  +
		     'attribute vec3 norm;' +
		     'uniform mat4 m_mat;'  +
		     'uniform mat4 v_mat;'  +
		     'uniform mat4 p_mat;'  +
		     'varying lowp vec3 color;' +
		     'void main(void) { gl_Position = p_mat * v_mat * m_mat * vec4(pos, 1.0); color = norm; }';
	
	var ps_src = 'precision mediump float;' +
		     'varying lowp vec3 color;' +
		     'void main(void) { gl_FragColor = vec4(color, 1.0); }';

	this.s = new ShaderProgram(gl);
	this.vs = new Shader(gl, gl.VERTEX_SHADER, vs_src);
	this.ps = new Shader(gl, gl.FRAGMENT_SHADER, ps_src);

	var prog = this.s.program;

	this.s.attach(this.vs);
	this.s.attach(this.ps);
	this.s.link();

	this.s.vertexPosAttribute = gl.getAttribLocation(prog, "pos");
	this.s.vertexNormAttribute = gl.getAttribLocation(prog, "norm");
	this.s.mMatUniform = gl.getUniformLocation(prog, "m_mat");
	this.s.vMatUniform = gl.getUniformLocation(prog, "v_mat");
	this.s.pMatUniform = gl.getUniformLocation(prog, "p_mat");

      	this.s.bind_array = function(type, data, item_size)
      	{
      		var t = VertexBuffer.vertex_type;
      		
      			debugger;
      		if(type === t.VERTEX)
      		{
			gl.bindBuffer(gl.ARRAY_BUFFER, data);
			gl.vertexAttribPointer(self.s.vertexPosAttribute, item_size, gl.FLOAT, false, 0, 0);
      		}
      		else if(type === t.NORMAL)
      		{
			gl.bindBuffer(gl.ARRAY_BUFFER, data);
			gl.vertexAttribPointer(self.s.vertexNormAttribute, item_size, gl.FLOAT, false, 0, 0);
      		}
      	}
      	
      	this.s.apply_uniforms = this.apply_uniforms = function()
      	{
		gl.uniformMatrix4fv(self.s.mMatUniform, false, self.transform);
		gl.uniformMatrix4fv(self.s.vMatUniform, false, self.camera.view);
		gl.uniformMatrix4fv(self.s.pMatUniform, false, self.camera.projection);
		gl.enableVertexAttribArray(self.s.vertexPosAttribute);
		gl.enableVertexAttribArray(self.s.vertexNormAttribute);
		
		var r = core.renderer;
		
		r.set_depth_enable(self.is3d);
		r.set_blend_mode(r.blend_mode.NORMAL);
      	};
      	
	this.update_input = function(slot, data)
	{
		if(slot.index === 0)
			self.is3d = data;
		else if(slot.index === 1)
			self.camera = data;
		else
			self.transform = data;
	};
	
	this.update_output = function(slot)
	{
		return self.s;
	};
	
	this.state_changed = function(ui)
	{
		if(!ui)
		{
			self.is3d = false;
			self.camera = new Camera(gl);
			self.transform = mat4.create();
	
			mat4.identity(this.transform);
		}
	};

      	this.state_changed(null);
};