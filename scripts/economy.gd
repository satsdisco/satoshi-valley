extends Node

## Global economy manager — handles sats, market cycles, difficulty

# Wallet
var balance: int = 1000  # Starting sats
var total_earned: int = 0
var total_spent: int = 0

# Mining network
var active_rigs: Array[MiningRig] = []
var total_hashrate: float = 0.0
var network_difficulty: float = 1.0

# Market cycle
enum MarketPhase { ACCUMULATION, HYPE, EUPHORIA, CAPITULATION }
var current_phase: MarketPhase = MarketPhase.ACCUMULATION
var phase_day: int = 0
var cycle_count: int = 0

# Price multipliers per phase (affects sell prices)
const PHASE_MULTIPLIERS = {
	MarketPhase.ACCUMULATION: 0.8,
	MarketPhase.HYPE: 1.2,
	MarketPhase.EUPHORIA: 2.0,
	MarketPhase.CAPITULATION: 0.5
}

# Fiat inflation rate per cycle
var fiat_inflation: float = 1.0
const INFLATION_RATE: float = 0.05  # 5% per cycle

signal balance_changed(new_balance: int)
signal phase_changed(new_phase: MarketPhase)
signal block_found_global(rig: MiningRig, reward: int)
signal halving_event(new_cycle: int)

func _ready() -> void:
	pass

func register_rig(rig: MiningRig) -> void:
	if rig not in active_rigs:
		active_rigs.append(rig)
		rig.sats_earned.connect(_on_rig_earned.bind(rig))
		rig.block_found.connect(_on_block_found.bind(rig))
		rig.rig_broken.connect(_on_rig_broken.bind(rig))
		_recalculate_hashrate()

func unregister_rig(rig: MiningRig) -> void:
	active_rigs.erase(rig)
	_recalculate_hashrate()

func _on_rig_earned(amount: int, _rig: MiningRig) -> void:
	# Apply difficulty modifier
	var adjusted = int(amount / network_difficulty)
	if adjusted < 1:
		adjusted = 1
	add_sats(adjusted)

func _on_block_found(reward: int, rig: MiningRig) -> void:
	add_sats(reward)
	block_found_global.emit(rig, reward)
	print("⛏️ BLOCK FOUND! +%d sats!" % reward)

func _on_rig_broken(_rig: MiningRig) -> void:
	_recalculate_hashrate()

func add_sats(amount: int) -> void:
	balance += amount
	total_earned += amount
	balance_changed.emit(balance)

func spend_sats(amount: int) -> bool:
	if balance >= amount:
		balance -= amount
		total_spent += amount
		balance_changed.emit(balance)
		return true
	return false

func _recalculate_hashrate() -> void:
	total_hashrate = 0.0
	for rig in active_rigs:
		total_hashrate += rig.current_hashrate
	
	# Adjust difficulty based on total hashrate
	# Every 10 TH/s of total hashrate increases difficulty
	network_difficulty = 1.0 + (total_hashrate / 10.0) * 0.5

func advance_day() -> void:
	phase_day += 1
	
	# Phase transition every 28 days
	if phase_day >= 28:
		phase_day = 0
		_advance_phase()

func _advance_phase() -> void:
	match current_phase:
		MarketPhase.ACCUMULATION:
			current_phase = MarketPhase.HYPE
		MarketPhase.HYPE:
			current_phase = MarketPhase.EUPHORIA
		MarketPhase.EUPHORIA:
			current_phase = MarketPhase.CAPITULATION
		MarketPhase.CAPITULATION:
			current_phase = MarketPhase.ACCUMULATION
			_on_new_cycle()
	
	phase_changed.emit(current_phase)

func _on_new_cycle() -> void:
	cycle_count += 1
	fiat_inflation *= (1.0 + INFLATION_RATE)
	
	# Halving every 4 cycles
	if cycle_count % 4 == 0:
		halving_event.emit(cycle_count)
		print("🔶 HALVING EVENT! Cycle %d" % cycle_count)

func get_phase_name() -> String:
	match current_phase:
		MarketPhase.ACCUMULATION: return "Accumulation"
		MarketPhase.HYPE: return "Hype"
		MarketPhase.EUPHORIA: return "Euphoria"
		MarketPhase.CAPITULATION: return "Capitulation"
	return "Unknown"

func get_price_multiplier() -> float:
	return PHASE_MULTIPLIERS[current_phase]

func get_fiat_price(base_sats: int) -> int:
	## Convert a sat price to inflated fiat price
	return int(base_sats * fiat_inflation)
