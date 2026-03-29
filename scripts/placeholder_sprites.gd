@tool
extends EditorScript

## Run this once in the editor (File → Run) to generate placeholder sprites
## Delete this after you have real art

func _run() -> void:
	_create_player_sprite()
	_create_rig_sprite()
	_create_tileset_sprites()
	print("✅ Placeholder sprites generated in assets/sprites/")

func _create_player_sprite() -> void:
	# 16x16 orange character
	var img = Image.create(16, 16, false, Image.FORMAT_RGBA8)
	var orange = Color("#F7931A")
	var dark_orange = Color("#C47415")
	var skin = Color("#FFD5A0")
	
	# Body (orange shirt)
	for x in range(4, 12):
		for y in range(6, 14):
			img.set_pixel(x, y, orange)
	# Head
	for x in range(5, 11):
		for y in range(2, 7):
			img.set_pixel(x, y, skin)
	# Eyes
	img.set_pixel(6, 4, Color.BLACK)
	img.set_pixel(9, 4, Color.BLACK)
	# Legs
	for y in range(14, 16):
		for x in range(5, 7):
			img.set_pixel(x, y, dark_orange)
		for x in range(9, 11):
			img.set_pixel(x, y, dark_orange)
	
	img.save_png("res://assets/sprites/player.png")

func _create_rig_sprite() -> void:
	# 16x16 mining rig (gray box with green LED)
	var img = Image.create(16, 16, false, Image.FORMAT_RGBA8)
	var gray = Color("#555555")
	var dark_gray = Color("#333333")
	var green = Color("#00FF00")
	var vent = Color("#444444")
	
	# Main body
	for x in range(1, 15):
		for y in range(3, 15):
			img.set_pixel(x, y, gray)
	# Top panel
	for x in range(1, 15):
		for y in range(1, 3):
			img.set_pixel(x, y, dark_gray)
	# Vent lines
	for x in range(3, 13):
		img.set_pixel(x, 6, vent)
		img.set_pixel(x, 9, vent)
		img.set_pixel(x, 12, vent)
	# Power LED
	img.set_pixel(2, 2, green)
	img.set_pixel(3, 2, green)
	
	img.save_png("res://assets/sprites/mining_rig.png")

func _create_tileset_sprites() -> void:
	# Grass tile 16x16
	var grass = Image.create(16, 16, false, Image.FORMAT_RGBA8)
	var grass_colors = [Color("#4A7C2E"), Color("#5A8C3E"), Color("#3A6C1E")]
	for x in range(16):
		for y in range(16):
			grass.set_pixel(x, y, grass_colors[(x * 7 + y * 13) % 3])
	grass.save_png("res://assets/sprites/tile_grass.png")
	
	# Dirt tile
	var dirt = Image.create(16, 16, false, Image.FORMAT_RGBA8)
	var dirt_colors = [Color("#8B6914"), Color("#7B5904"), Color("#9B7924")]
	for x in range(16):
		for y in range(16):
			dirt.set_pixel(x, y, dirt_colors[(x * 11 + y * 7) % 3])
	dirt.save_png("res://assets/sprites/tile_dirt.png")
	
	# Stone tile
	var stone = Image.create(16, 16, false, Image.FORMAT_RGBA8)
	var stone_colors = [Color("#808080"), Color("#707070"), Color("#909090")]
	for x in range(16):
		for y in range(16):
			stone.set_pixel(x, y, stone_colors[(x * 3 + y * 5) % 3])
	stone.save_png("res://assets/sprites/tile_stone.png")
