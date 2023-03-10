import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;

const {Cube, Axis_Arrows, Textured_Phong} = defs

export class Assignment4 extends Scene {
    /**
     *  **Base_scene** is a Scene that can be added to any display canvas.
     *  Setup the shapes, materials, camera, and lighting here.
     */
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // TODO:  Create two cubes, including one with the default texture coordinates (from 0 to 1), and one with the modified
        //        texture coordinates as required for cube #2.  You can either do this by modifying the cube code or by modifying
        //        a cube instance's texture_coords after it is already created.
        this.shapes = {
            box_1: new Cube(),
            box_2: new Cube(),
            axis: new Axis_Arrows()
        }
        // console.log(this.shapes.box_1.arrays.texture_coord)
        // console.log(this.shapes.box_2.arrays.texture_coord.map((coords) => coords.map((coord) => coord/2)))
        this.shapes.box_2.arrays.texture_coord = this.shapes.box_2.arrays.texture_coord.map((coords) => coords.map((coord) => coord*2))

        // TODO:  Create the materials required to texture both cubes with the correct images and settings.
        //        Make each Material from the correct shader.  Phong_Shader will work initially, but when
        //        you get to requirements 6 and 7 you will need different ones.
        this.materials = {
            phong: new Material(new Textured_Phong(), {
                color: hex_color("#ffffff"),
            }),
            stars: new Material(new Texture_Rotate(), {
                color: hex_color("#000000"),
                ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/stars.png", "NEAREST")
            }),
            earth: new Material(new Texture_Scroll_X(), {
                color: hex_color("#000000"),
                ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/earth.gif", "LINEAR_MIPMAP_LINEAR")
            })
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
        this.rotationOn = false;
        this.box1_transform_saved = Mat4.identity().times(Mat4.translation(-2,0,0));
        this.box2_transform_saved = Mat4.identity().times(Mat4.translation(2,0,0));
    }

    make_control_panel() {
        // TODO:  Implement requirement #5 using a key_triggered_button that responds to the 'c' key.
        this.key_triggered_button("Cube rotation", ["c"], () => {this.rotationOn = !this.rotationOn});
        this.new_line();
    }

    display(context, program_state) {
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.translation(0, 0, -8));
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        const light_position = vec4(10, 10, 10, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        let t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let box1_transform = this.box1_transform_saved;
        let box2_transform = this.box2_transform_saved;

        // TODO:  Draw the required boxes. Also update their stored matrices.
        // You can remove the folloeing line.
        // this.shapes.axis.draw(context, program_state, model_transform, this.materials.phong.override({color: hex_color("#ffff00")}));
        if (this.rotationOn) {
            box1_transform = box1_transform.times(Mat4.rotation(((2/3)*Math.PI*dt) % 3,1,0,0))
            box2_transform = box2_transform.times(Mat4.rotation((Math.PI*dt) % 3,0,1,0))
        }
        this.shapes.box_1.draw(context, program_state, box1_transform, this.materials.stars)
        this.shapes.box_2.draw(context, program_state, box2_transform, this.materials.earth)
        this.box1_transform_saved = box1_transform;
        this.box2_transform_saved = box2_transform;
    }
}


class Texture_Scroll_X extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #6.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){
                // Sample the texture image in the correct place:
                vec2 trans_f_tex_coord = f_tex_coord;
                trans_f_tex_coord.x -= 2.0 * mod(animation_time, 3.0);
                vec4 tex_color = texture2D( texture, trans_f_tex_coord);
                
                float u = mod(trans_f_tex_coord.x, 1.0);
                float v = mod(trans_f_tex_coord.y, 1.0);
                
                if (u > 0.15 && u < 0.25 && v > 0.15 && v < 0.85) {
                    tex_color = vec4(0, 0, 0, 1.0);
                }
                if (v > 0.75 && v < 0.85 && u > 0.15 && u < 0.85) {
                    tex_color = vec4(0, 0, 0, 1.0);
                }
                if (u > 0.75 && u < 0.85 && v > 0.15 && v < 0.85) {
                    tex_color = vec4(0, 0, 0, 1.0);
                }
                if (v > 0.15 && v < 0.25 && u > 0.15 && u < 0.85) {
                    tex_color = vec4(0, 0, 0, 1.0);
                }

                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}


class Texture_Rotate extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #7.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            void main(){
                vec2 new_texture = f_tex_coord;
                new_texture.x -= 0.5;
                new_texture.y -= 0.5;
                float PI = 3.14159265359;
                float Rotation = -mod(0.25*animation_time,3.0) * 2.0 * PI;
                mat2 rotate_f_tex_coord = mat2(cos(Rotation),sin(Rotation),-sin(Rotation),cos(Rotation));
                new_texture = rotate_f_tex_coord * new_texture;
                new_texture.x += 0.5;
                new_texture.y += 0.5;
                // Sample the texture image in the correct place:
                vec4 tex_color = texture2D( texture, new_texture );

                float u = mod(new_texture.x, 1.0);
                float v = mod(new_texture.y, 1.0);
                
                if (u > 0.15 && u < 0.25 && v > 0.15 && v < 0.85) {
                    tex_color = vec4(0, 0, 0, 1.0);
                }
                if (v > 0.75 && v < 0.85 && u > 0.15 && u < 0.85) {
                    tex_color = vec4(0, 0, 0, 1.0);
                }
                if (u > 0.75 && u < 0.85 && v > 0.15 && v < 0.85) {
                    tex_color = vec4(0, 0, 0, 1.0);
                }
                if (v > 0.15 && v < 0.25 && u > 0.15 && u < 0.85) {
                    tex_color = vec4(0, 0, 0, 1.0);
                }

                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}

