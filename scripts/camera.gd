extends Camera2D

## Smooth follow camera for the player

@export var target: Node2D
@export var smoothing: float = 5.0

func _ready() -> void:
	# Find player if target not set
	if not target:
		target = get_tree().get_first_node_in_group("player")

func _process(delta: float) -> void:
	if target:
		global_position = global_position.lerp(target.global_position, smoothing * delta)
