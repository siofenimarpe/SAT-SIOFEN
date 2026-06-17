import os

def generar_arbol(ruta_directorio, prefijo=""):
    # Carpetas ocultas o de sistema que no queremos ver en el mapa
    carpetas_ignoradas = {'.git', 'node_modules', '__pycache__', '.vscode'}

    try:
        elementos = os.listdir(ruta_directorio)
    except PermissionError:
        return

    # Filtramos las carpetas ignoradas y ordenamos alfabéticamente
    elementos = [e for e in elementos if e not in carpetas_ignoradas]
    # Separar carpetas y archivos para que las carpetas salgan primero
    carpetas = sorted([e for e in elementos if os.path.isdir(os.path.join(ruta_directorio, e))])
    archivos = sorted([e for e in elementos if os.path.isfile(os.path.join(ruta_directorio, e))])
    elementos_ordenados = carpetas + archivos

    for i, elemento in enumerate(elementos_ordenados):
        ruta_completa = os.path.join(ruta_directorio, elemento)
        es_ultimo = (i == len(elementos_ordenados) - 1)
        
        # Símbolos para dibujar las ramas del árbol
        conector = "└── " if es_ultimo else "├── "
        
        print(f"{prefijo}{conector}{elemento}")

        if os.path.isdir(ruta_completa):
            # Si es carpeta, entramos a escanearla recursivamente
            extension_rama = "    " if es_ultimo else "│   "
            generar_arbol(ruta_completa, prefijo + extension_rama)

if __name__ == "__main__":
    # "." significa que escaneará la carpeta actual donde se ejecuta el script
    ruta_raiz = "." 
    print(f"🌲 ÁRBOL DEL PROYECTO: {os.path.abspath(ruta_raiz)}\n")
    generar_arbol(ruta_raiz)