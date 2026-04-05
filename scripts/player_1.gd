extends CharacterBody2D

const speed = 240
var current_dir = "none"

# --- NUEVA VARIABLE ---
var tiene_basura = false # Indica si el jugador carga algo

func _ready():
	$AnimatedSprite2D.play("quieto_de_frente")

func _physics_process(delta):
	player_movement(delta)
	
func player_movement(delta):
	if Input.is_action_pressed("ui_right"):
		current_dir = "right"
		play_anim(1)
		velocity.x = speed
		velocity.y = 0
	elif Input.is_action_pressed("ui_left"):
		current_dir = "left"
		play_anim(1)
		velocity.x = -speed
		velocity.y = 0
	elif Input.is_action_pressed("ui_up"):
		current_dir = "up"
		play_anim(1)
		velocity.y = -speed
		velocity.x = 0
	elif Input.is_action_pressed("ui_down"):
		current_dir = "down"
		play_anim(1)
		velocity.y = speed
		velocity.x = 0
	else:
		play_anim(0)
		velocity.x = 0
		velocity.y = 0
		
	move_and_slide()

# --- NUEVAS FUNCIONES PARA LOS OBJETOS ---

func recoger_objeto():
	tiene_basura = true
	print("Jugador: ¡Recogí la basura!")
	# Aquí podrías cambiar el color del sprite o mostrar un icono 
	# para que el jugador sepa que lleva algo.
	modulate = Color(0.7, 1, 0.7) # Se pone un poco verde al cargar basura

func soltar_objeto():
	tiene_basura = false
	print("Jugador: Entregué la basura.")
	modulate = Color(1, 1, 1) # Vuelve a su color normal

# ---------------------------------------

func play_anim(movement):
	var dir = current_dir
	var anim = $AnimatedSprite2D
	
	if dir == "right":
		anim.flip_h = false
		if movement == 1:
			anim.play("caminar_derecho")
		elif movement == 0:
			anim.play("quieto_de_frente")
	if dir == "left":
		anim.flip_h = false # Cambié esto a false si ya tienes animación de "caminar_izquierdo"
		if movement == 1:
			anim.play("caminar_izquierdo")
		elif movement == 0:
			anim.play("quieto_de_frente")
			
	if dir == "up":
		anim.flip_h = false
		if movement == 1:
			anim.play("caminar_espalda")
		elif movement == 0:
			anim.play("quieto_de_frente")
	if dir == "down":
		anim.flip_h = false 
		if movement == 1:
			anim.play("caminar_frente")
		elif movement == 0:
			anim.play("quieto_de_frente")
