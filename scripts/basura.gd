extends Area2D

@onready var anim = $AnimatedSprite2D 

func _on_body_entered(body):
	# 1. Verificamos que sea el jugador
	if body.name == "player_1":
		# 2. Verificamos si el jugador tiene la variable 'tiene_basura' en true
		if body.tiene_basura == true:
			anim.play("abierta")   # Abre la tapa
			body.soltar_objeto()   # <--- ESTO le quita el color amarillo al personaje
			print("¡Basura entregada!")
		else:
			print("No tienes nada que entregar.")

func _on_body_exited(body):
	if body.name == "player_1":
		anim.play("cerrada")  # Cierra la tapa al alejarte
