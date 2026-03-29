extends CanvasLayer

## Heads-up display — shows sats balance, time, hashrate, phase

@onready var sats_label: Label = $MarginContainer/VBoxContainer/SatsLabel
@onready var time_label: Label = $MarginContainer/VBoxContainer/TimeLabel
@onready var day_label: Label = $MarginContainer/VBoxContainer/DayLabel
@onready var hashrate_label: Label = $MarginContainer/VBoxContainer/HashrateLabel
@onready var phase_label: Label = $MarginContainer/VBoxContainer/PhaseLabel

# Block found notification
@onready var block_notification: Label = $BlockNotification
var notification_timer: float = 0.0

func _ready() -> void:
	var economy = get_node_or_null("/root/Economy")
	if economy:
		economy.balance_changed.connect(_on_balance_changed)
		economy.block_found_global.connect(_on_block_found)
		economy.phase_changed.connect(_on_phase_changed)
		_on_balance_changed(economy.balance)
	
	if block_notification:
		block_notification.visible = false

func _process(delta: float) -> void:
	_update_time_display()
	_update_hashrate_display()
	
	# Fade block notification
	if notification_timer > 0:
		notification_timer -= delta
		if notification_timer <= 0:
			block_notification.visible = false

func _on_balance_changed(new_balance: int) -> void:
	if sats_label:
		# Format with commas
		sats_label.text = "₿ %s sats" % _format_number(new_balance)

func _on_block_found(_rig: MiningRig, reward: int) -> void:
	if block_notification:
		block_notification.text = "⛏️ BLOCK FOUND! +%s sats!" % _format_number(reward)
		block_notification.visible = true
		notification_timer = 5.0  # Show for 5 seconds

func _on_phase_changed(new_phase: int) -> void:
	var economy = get_node_or_null("/root/Economy")
	if economy and phase_label:
		phase_label.text = "Phase: %s" % economy.get_phase_name()

func _update_time_display() -> void:
	var day_night = get_node_or_null("/root/Main/DayNightCycle")
	if day_night:
		if time_label:
			time_label.text = day_night.get_time_string()
		if day_label:
			day_label.text = "Day %d — %s" % [day_night.current_day, day_night.get_period()]

func _update_hashrate_display() -> void:
	var economy = get_node_or_null("/root/Economy")
	if economy and hashrate_label:
		hashrate_label.text = "⚡ %.1f TH/s | Diff: %.1f" % [economy.total_hashrate, economy.network_difficulty]

func _format_number(n: int) -> String:
	var s = str(abs(n))
	var result = ""
	var count = 0
	for i in range(s.length() - 1, -1, -1):
		if count > 0 and count % 3 == 0:
			result = "," + result
		result = s[i] + result
		count += 1
	if n < 0:
		result = "-" + result
	return result
