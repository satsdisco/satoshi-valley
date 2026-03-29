extends CanvasModulate

## Day/night cycle — one full day = 18 real minutes (1080 seconds)

const DAY_LENGTH: float = 1080.0  # seconds per in-game day
const HOURS_PER_DAY: int = 24

# Time tracking
var current_time: float = 0.0  # 0.0 to 1.0 (fraction of day)
var current_hour: int = 6      # Start at 6 AM
var current_day: int = 1
var is_paused: bool = false

# Time speed (1.0 = normal, 2.0 = double speed)
var time_scale: float = 1.0

# Color gradient for day/night
var dawn_color: Color = Color(0.85, 0.75, 0.65)      # 5-7 AM warm sunrise
var morning_color: Color = Color(1.0, 1.0, 1.0)       # 7-11 AM full brightness
var noon_color: Color = Color(1.0, 0.98, 0.95)        # 11 AM-2 PM slight warm
var afternoon_color: Color = Color(1.0, 0.95, 0.85)   # 2-5 PM golden hour start
var sunset_color: Color = Color(0.9, 0.65, 0.45)      # 5-7 PM orange sunset
var dusk_color: Color = Color(0.4, 0.35, 0.55)        # 7-9 PM purple twilight
var night_color: Color = Color(0.15, 0.15, 0.3)       # 9 PM-5 AM deep night
var midnight_color: Color = Color(0.1, 0.1, 0.25)     # Darkest

signal hour_changed(hour: int)
signal day_changed(day: int)
signal time_of_day_changed(period: String)

func _ready() -> void:
	# Start at 6:00 AM
	current_time = 6.0 / 24.0
	_update_lighting()

func _process(delta: float) -> void:
	if is_paused:
		return
	
	# Advance time
	var time_increment = (delta * time_scale) / DAY_LENGTH
	current_time += time_increment
	
	# New day
	if current_time >= 1.0:
		current_time -= 1.0
		current_day += 1
		day_changed.emit(current_day)
		
		# Notify economy to advance day
		var economy = get_node_or_null("/root/Economy")
		if economy:
			economy.advance_day()
	
	# Track hours
	var new_hour = int(current_time * HOURS_PER_DAY)
	if new_hour != current_hour:
		current_hour = new_hour
		hour_changed.emit(current_hour)
	
	_update_lighting()

func _update_lighting() -> void:
	var hour_float = current_time * 24.0
	var target_color: Color
	
	if hour_float < 5.0:
		target_color = midnight_color.lerp(night_color, hour_float / 5.0)
	elif hour_float < 7.0:
		target_color = night_color.lerp(dawn_color, (hour_float - 5.0) / 2.0)
	elif hour_float < 11.0:
		target_color = dawn_color.lerp(morning_color, (hour_float - 7.0) / 4.0)
	elif hour_float < 14.0:
		target_color = morning_color.lerp(noon_color, (hour_float - 11.0) / 3.0)
	elif hour_float < 17.0:
		target_color = noon_color.lerp(afternoon_color, (hour_float - 14.0) / 3.0)
	elif hour_float < 19.0:
		target_color = afternoon_color.lerp(sunset_color, (hour_float - 17.0) / 2.0)
	elif hour_float < 21.0:
		target_color = sunset_color.lerp(dusk_color, (hour_float - 19.0) / 2.0)
	else:
		target_color = dusk_color.lerp(midnight_color, (hour_float - 21.0) / 3.0)
	
	color = target_color

func get_time_string() -> String:
	var hours = current_hour
	var minutes = int((current_time * 24.0 - current_hour) * 60)
	var period = "AM" if hours < 12 else "PM"
	var display_hour = hours % 12
	if display_hour == 0:
		display_hour = 12
	return "%d:%02d %s" % [display_hour, minutes, period]

func get_period() -> String:
	if current_hour >= 5 and current_hour < 7:
		return "Dawn"
	elif current_hour >= 7 and current_hour < 12:
		return "Morning"
	elif current_hour >= 12 and current_hour < 14:
		return "Noon"
	elif current_hour >= 14 and current_hour < 17:
		return "Afternoon"
	elif current_hour >= 17 and current_hour < 21:
		return "Evening"
	else:
		return "Night"

func is_nighttime() -> bool:
	return current_hour >= 21 or current_hour < 5
