require("dotenv").config();
const mysql = require("mysql2/promise");

async function sincronizarBasesDeDatos() {
  try {
    // Conexión a la base de datos local
    const localDb = await mysql.createConnection({
      host: process.env.LOCAL_HOST,
      user: process.env.LOCAL_USER,
      password: process.env.LOCAL_PASSWORD,
      database: "inventario_dinamico", // Conexión inicial a inventario_dinamico
    });

    // --- Ejecutar el procedimiento SincronizarProductoDescripcion ---
    console.log("Ejecutando SincronizarProductoDescripcion...");
    await localDb.execute("CALL SincronizarProductoDescripcion();");
    console.log("Procedimiento SincronizarProductoDescripcion ejecutado.");

    // Cambiar a la base de datos compuservicessoft
    await localDb.changeUser({ database: "compuservicessoft" });

    // --- Ejecutar el procedimiento SincronizarInventario ---
    console.log("Ejecutando SincronizarInventario...");
    await localDb.execute("CALL SincronizarInventario();");
    console.log("Procedimiento SincronizarInventario ejecutado.");

    // Conexión a la base de datos online (Railway)
    const onlineDb = await mysql.createConnection({
      host: process.env.ONLINE_HOST,
      user: process.env.ONLINE_USER,
      password: process.env.ONLINE_PASSWORD,
      database: process.env.ONLINE_DATABASE,
      port: process.env.ONLINE_PORT,
      connectTimeout: 30000, // 30 segundos de timeout
    });

    console.log("Conexiones establecidas correctamente.");

    // --- Sincronizar la tabla de categorías ---
    const [categoriasLocales] = await localDb.execute("SELECT * FROM categoria");

    for (const categoria of categoriasLocales) {
      const [categoriaOnline] = await onlineDb.execute(
        "SELECT id FROM categoria WHERE id = ?",
        [categoria.id]
      );

      if (categoriaOnline.length > 0) {
        // Actualizar categoría existente
        await onlineDb.execute(
          `
          UPDATE categoria 
          SET nombre = ?, descripcion = ?, descripcion_garantia = ?
          WHERE id = ?
        `,
          [
            categoria.nombre,
            categoria.descripcion,
            categoria.descripcion_garantia,
            categoria.id,
          ]
        );
      } else {
        // Insertar nueva categoría
        await onlineDb.execute(
          `
          INSERT INTO categoria (id, nombre, descripcion, descripcion_garantia)
          VALUES (?, ?, ?, ?)
        `,
          [
            categoria.id,
            categoria.nombre,
            categoria.descripcion,
            categoria.descripcion_garantia,
          ]
        );
      }
    }

    // Eliminar categorías que ya no existen en la base local
    const [categoriasOnline] = await onlineDb.execute("SELECT id FROM categoria");
    for (const categoria of categoriasOnline) {
      const existeEnLocal = categoriasLocales.some(
        (localCategoria) => localCategoria.id === categoria.id
      );

      if (!existeEnLocal) {
        await onlineDb.execute("DELETE FROM categoria WHERE id = ?", [
          categoria.id,
        ]);
      }
    }

    console.log("Sincronización de categorías completada.");

    // --- Sincronizar la tabla de productos ---
    const [productosLocales] = await localDb.execute("SELECT * FROM producto");

    for (const producto of productosLocales) {
      const [productoOnline] = await onlineDb.execute(
        "SELECT id FROM producto WHERE id = ?",
        [producto.id]
      );

      if (productoOnline.length > 0) {
        // Actualizar producto existente
        await onlineDb.execute(
          `
          UPDATE producto 
          SET nombre = ?, precio_vendido = ?, cantidad = ?, total = ?, descripcion = ?, categoria_id = ?, estado = ?, imagen = ?
          WHERE id = ?
        `,
          [
            producto.nombre,
            producto.precio_vendido,
            producto.cantidad,
            producto.total,
            producto.descripcion,
            producto.categoria_id,
            producto.estado,
            producto.imagen,
            producto.id,
          ]
        );
      } else {
        // Insertar nuevo producto
        await onlineDb.execute(
          `
          INSERT INTO producto (id, nombre, precio_vendido, cantidad, total, descripcion, categoria_id, estado, imagen)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            producto.id,
            producto.nombre,
            producto.precio_vendido,
            producto.cantidad,
            producto.total,
            producto.descripcion,
            producto.categoria_id,
            producto.estado,
            producto.imagen,
          ]
        );
      }
    }

    // Eliminar productos que ya no existen en la base local
    const [productosOnline] = await onlineDb.execute("SELECT id FROM producto");
    for (const producto of productosOnline) {
      const existeEnLocal = productosLocales.some(
        (localProducto) => localProducto.id === producto.id
      );

      if (!existeEnLocal) {
        await onlineDb.execute("DELETE FROM producto WHERE id = ?", [
          producto.id,
        ]);
      }
    }

    console.log("Sincronización de productos completada.");

    // Cerrar conexiones
    await localDb.end();
    await onlineDb.end();
    console.log("Sincronización completada correctamente.");
  } catch (error) {
    console.error("Error durante la sincronización:", error);
  }
}

// Ejecutar el script
sincronizarBasesDeDatos();
