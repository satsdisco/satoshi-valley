extends CharacterBody2D

## Player movement and interaction controller

const SPEED = 120.0

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var interaction_ray: RayCast2D = $InteractionRay

var facing_direction: Vector2 = Vector2.DOWN

func _physics_process(_delta: float) -> void:
	var input_direction = Vector2(
		Input.get_axis("move_left", "move_right"),
		Input.get_axis("move_up", "move_down")
	)
	
	if input_direction != Vector2.ZERO:
		input_direction = input_direction.normalized()
		facing_direction = input_direction
		velocity = input_direction * SPEED
		_update_animation("walk")
		_update_interaction_ray()
	else:
		velocity = Vector2.ZERO
		_update_animation("idle")
	
	move_and_slide()

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("interact"):
		_try_interact()
	elif event.is_action_pressed("place_rig"):
		_try_place_rig()

func _update_animation(state: String) -> void:
	var dir_name = _get_direction_name()
	var anim_name = state + "_" + dir_name
	if sprite.sprite_frames and sprite.sprite_frames.has_animation(anim_name):
		sprite.play(anim_name)

func _get_direction_name() -> String:
	if abs(facing_direction.x) > abs(facing_direction.y):
		return "right" if facing_direction.x > 0 else "left"
	else:
		return "down" if facing_direction.y > 0 else "up"

func _update_interaction_ray() -> void:
	interaction_ray.target_position = facing_direction * 20

func _try_interact() -> void:
	interaction_ray.force_raycast_update()
	if interaction_ray.is_colliding():
		var collider = interaction_ray.get_collider()
		if collider.has_method("interact"):
			collider.interact()

func _try_place_rig() -> void:
	var place_pos = global_position + facing_direction * 32
	# Snap to grid (16px tiles)
	place_pos = place_pos.snapped(Vector2(16, 16))
	
	var rig_scene = preload("res://scenes/objects/mining_rig.tscn")
	var rig = rig_scene.instantiate()
	rig.global_position = place_pos
	get_tree().current_scene.add_child(rig)
	
	# Notify economy
	var economy = get_node_or_null("/root/Economy")
	if economy:
		economy.register_rig(rig)
