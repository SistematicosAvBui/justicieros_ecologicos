extends Area2D 

func _on_body_entered(body):
	if body.name == "player_1":
		if body.has_method("recoger_objeto"):
			body.recoger_objeto() # Llama a la función que lo pone amarillo
			queue_free() # HACE QUE LA BANANA DESAPAREZCA
