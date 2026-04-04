extends Area2D

# Referencia al AnimatedSprite2D (asegúrate de que se llame así)
@onready var anim = $AnimatedSprite2D 

func _ready():
	# Al empezar, la caneca debe estar cerrada
	anim.play("cerrada")

# Cuando el jugador entra al área
func _on_body_entered(body):
	if body.name == "player_1": # Verifica que sea tu personaje
		anim.play("abierta")
		print("Cerca de la basura: Abriendo...")

# Cuando el jugador se aleja del área
func _on_body_exited(body):
	if body.name == "player_1":
		anim.play("cerrada")
		print("Lejos de la basura: Cerrando...")
