extends StaticBody2D
class_name MiningRig

## A Bitcoin mining rig that consumes power and generates sats

enum RigTier { CPU, GPU, ASIC }

@export var tier: RigTier = RigTier.CPU
@export var base_hashrate: float = 1.0  # TH/s equivalent (abstract units)
@export var power_draw: float = 0.5     # kW
@export var heat_output: float = 0.3    # heat units per tick
@export var durability: float = 100.0   # 0-100

# Runtime state
var is_powered: bool = true
var is_overheating: bool = false
var current_hashrate: float = 0.0
var temperature: float = 20.0  # celsius
var sats_mined: int = 0

# Tier configurations
const TIER_CONFIG = {
	RigTier.CPU: {
		"name": "CPU Miner",
		"hashrate": 1.0,
		"power": 0.3,
		"heat": 0.2,
		"cost": 500,
		"icon_frame": 0
	},
	RigTier.GPU: {
		"name": "GPU Rig",
		"hashrate": 5.0,
		"power": 1.2,
		"heat": 0.8,
		"cost": 5000,
		"icon_frame": 1
	},
	RigTier.ASIC: {
		"name": "ASIC Miner",
		"hashrate": 50.0,
		"power": 3.0,
		"heat": 2.0,
		"cost": 50000,
		"icon_frame": 2
	}
}

@onready var sprite: Sprite2D = $Sprite2D
@onready var status_label: Label = $StatusLabel
@onready var heat_timer: Timer = $HeatTimer
@onready var mine_timer: Timer = $MineTimer

signal block_found(reward: int)
signal rig_broken()
signal sats_earned(amount: int)

func _ready() -> void:
	_apply_tier_config()
	mine_timer.timeout.connect(_on_mine_tick)
	heat_timer.timeout.connect(_on_heat_tick)
	mine_timer.start(2.0)  # Mine tick every 2 seconds
	heat_timer.start(3.0)  # Heat tick every 3 seconds

func _apply_tier_config() -> void:
	var config = TIER_CONFIG[tier]
	base_hashrate = config["hashrate"]
	power_draw = config["power"]
	heat_output = config["heat"]

func _on_mine_tick() -> void:
	if not is_powered or is_overheating or durability <= 0:
		current_hashrate = 0.0
		_update_status()
		return
	
	# Calculate effective hashrate (affected by heat and durability)
	var heat_penalty = 1.0 - clamp((temperature - 70.0) / 30.0, 0.0, 0.5)
	var durability_penalty = durability / 100.0
	current_hashrate = base_hashrate * heat_penalty * durability_penalty
	
	# Earn sats based on hashrate (simplified: 1 TH/s ≈ 10 sats per tick)
	var earned = int(current_hashrate * 10)
	if earned > 0:
		sats_mined += earned
		sats_earned.emit(earned)
	
	# Small chance to find a block (lottery!)
	var block_chance = current_hashrate * 0.0001  # 0.01% per TH/s per tick
	if randf() < block_chance:
		var reward = 625000  # 6.25 BTC in sats (post-halving reward, simplified)
		sats_mined += reward
		block_found.emit(reward)
	
	# Wear and tear
	durability -= 0.01
	if durability <= 0:
		durability = 0
		rig_broken.emit()
	
	_update_status()

func _on_heat_tick() -> void:
	if is_powered and durability > 0:
		temperature += heat_output
	else:
		temperature -= 0.5  # Cool down when off
	
	# Ambient cooling (always trends toward 20°C)
	temperature -= (temperature - 20.0) * 0.05
	temperature = clamp(temperature, 15.0, 100.0)
	
	# Overheat check
	if temperature >= 85.0:
		is_overheating = true
	elif temperature < 70.0:
		is_overheating = false
	
	_update_status()

func _update_status() -> void:
	if not status_label:
		return
	if durability <= 0:
		status_label.text = "BROKEN"
		status_label.modulate = Color.RED
	elif is_overheating:
		status_label.text = "OVERHEAT"
		status_label.modulate = Color.ORANGE_RED
	elif not is_powered:
		status_label.text = "OFF"
		status_label.modulate = Color.GRAY
	else:
		status_label.text = "%d sat/s" % int(current_hashrate * 10)
		status_label.modulate = Color.GREEN

func interact() -> void:
	# Toggle power on interact
	is_powered = !is_powered
	_update_status()

func repair(amount: float = 25.0) -> void:
	durability = clamp(durability + amount, 0, 100)

func get_info() -> Dictionary:
	return {
		"tier": TIER_CONFIG[tier]["name"],
		"hashrate": current_hashrate,
		"power": power_draw,
		"temp": temperature,
		"durability": durability,
		"total_mined": sats_mined,
		"status": "broken" if durability <= 0 else "overheat" if is_overheating else "off" if not is_powered else "mining"
	}
