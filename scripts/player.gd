extends CharacterBody2D

## Player movement and interaction controller
## Controls: WASD/Arrows to move, E to interact, R to place mining rig

const SPEED = 120.0

@onready var sprite: Sprite2D = $Sprite2D
@onready var interaction_ray: RayCast2D = $InteractionRay

var facing_direction: Vector2 = Vector2.DOWN
var rig_scene: PackedScene = preload("res://scenes/objects/mining_rig.tscn")

func _ready() -> void:
	add_to_group("player")

func _physics_process(_delta: float) -> void:
	var input_direction = Vector2(
		Input.get_axis("move_left", "move_right"),
		Input.get_axis("move_up", "move_down")
	)
	
	if input_direction != Vector2.ZERO:
		input_direction = input_direction.normalized()
		facing_direction = input_direction
		velocity = input_direction * SPEED
		_update_interaction_ray()
		
		# Flip sprite based on horizontal direction
		if input_direction.x != 0:
			sprite.flip_h = input_direction.x < 0
	else:
		velocity = Vector2.ZERO
	
	move_and_slide()

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("interact"):
		_try_interact()
	elif event.is_action_pressed("place_rig"):
		_try_place_rig()

func _update_interaction_ray() -> void:
	interaction_ray.target_position = facing_direction * 24

func _try_interact() -> void:
	interaction_ray.force_raycast_update()
	if interaction_ray.is_colliding():
		var collider = interaction_ray.get_collider()
		if collider.has_method("interact"):
			collider.interact()
			print("Interacted with: ", collider.name)
	else:
		print("Nothing to interact with")

func _try_place_rig() -> void:
	var economy = get_node_or_null("/root/Economy")
	if economy and economy.balance < 500:
		print("Not enough sats! Need 500 to place a CPU miner.")
		return
	
	var place_pos = global_position + facing_direction * 32
	# Snap to 16px grid
	place_pos = place_pos.snapped(Vector2(16, 16))
	
	var rig = rig_scene.instantiate()
	rig.global_position = place_pos
	get_tree().current_scene.add_child(rig)
	
	# Register with economy and deduct cost
	if economy:
		economy.spend_sats(500)
		economy.register_rig(rig)
	
	print("⛏️ Placed mining rig at ", place_pos)
