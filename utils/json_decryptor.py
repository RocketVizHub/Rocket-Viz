# Read a json file and gives us the keys and imbricated keys if there are some

import json

def json_decryptor(json_file):
	with open(json_file) as f:
		data = json.load(f)
		for key in data:
			if isinstance(data[key], dict):
				for imbricated_key in data[key]:
					print(key + ' -> ' + imbricated_key)
					# checks if there is a second imbrication
					if isinstance(data[key][imbricated_key], dict):
						for imbricated_key2 in data[key][imbricated_key]:
							print(key + ' -> ' + imbricated_key + ' -> ' + imbricated_key2)
			else:
				print(key)
     
json_decryptor('utils/replay01.json')