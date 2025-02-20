require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT || 4000;

// Configurar conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DATABASE_USERNAME,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_DBNAME,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT,
});

// Prueba de conexión
pool
  .connect()
  .then(() => console.log("Conectado a PostgreSQL"))
  .catch((err) => console.error("Error de conexión:", err));

// Rutas básicas
app.get("/academic", (req, res) => {
  res.json({
    status: "success",
    data: "Academic API",
  });
});

// Obtener records académicos
app.get("/academic/record/:identification", async (req, res) => {
  const { identification } = req.params;

  try {
    const queryUniversity = await pool.query(
      "SELECT * FROM UNIVERSIDAD LIMIT 1",
      []
    );

    const randomUser = await pool.query(
      "SELECT * FROM estudiantes WHERE id_estudiante = $1",
      [Number(identification)]
    );

    const queryIncription = await pool.query(
      "SELECT * FROM inscripciones INNER JOIN materias ON materias.id_materia = inscripciones.id_materia INNER JOIN calificaciones ON calificaciones.id_inscripcion = inscripciones.id_inscripcion INNER JOIN semestres ON semestres.id_semestre = inscripciones.id_semestre WHERE id_estudiante = $1",
      [randomUser.rows[0].id_estudiante]
    );

    const querySchool = await pool.query(
      "SELECT * FROM escuelas where id_escuela = $1",
      [queryIncription.rows[0].id_escuela]
    );

    const queryFaculty = await pool.query(
      "SELECT * FROM facultades where id_facultad = $1",
      [querySchool.rows[0].id_facultad]
    );

    const queryAutority = await pool.query(
      "SELECT * FROM autoridad_entidad INNER JOIN autoridades ON autoridades.id_autoridad = autoridad_entidad.id_autoridad where id_escuela = $1",
      [queryIncription.rows[0].id_escuela]
    );

    const agrupadoPorSemestre = Object.values(
      queryIncription.rows.reduce((acc, item) => {
        if (!acc[item.semestre]) {
          const fecha_fin = new Date(item.fecha_fin);
          const fecha_inicio = new Date(item.fecha_inicio);
          const formattedFechaFin = `${fecha_fin.getDate()}/${
            fecha_fin.getMonth() + 1
          }/${fecha_fin.getFullYear()}`;
          const formattedFechaInicio = `${fecha_inicio.getDate()}/${
            fecha_inicio.getMonth() + 1
          }/${fecha_inicio.getFullYear()}`;

          acc[item.semestre] = {
            semester: `${formattedFechaInicio} - ${formattedFechaFin}`,
            courses: [],
            average: 0,
          };
        }

        acc[item.semestre].courses.push({
          code: item.id_materia,
          name: item.nombre,
          grade: item.calificacion,
          state: item.estado,
        });

        return acc;
      }, {})
    );

    agrupadoPorSemestre.forEach((semestre) => {
      const totalNotas = semestre.courses.reduce(
        (sum, curso) => sum + parseFloat(curso.grade),
        0
      );
      semestre.average = (totalNotas / semestre.courses.length).toFixed(2); // Redondear a 2 decimales
    });

    const average = agrupadoPorSemestre.reduce(
      (sum, semestre) => sum + parseFloat(semestre.average),
      0
    );
    const fecha_inicio = new Date(
      queryIncription.rows[0].fecha_inicio
    ).toISOString();
    const fecha_fin = new Date(
      queryIncription.rows[queryIncription.rows.length - 1].fecha_fin
    ).toISOString();

    const data = {
      university: queryUniversity.rows[0],
      faculty: queryFaculty.rows[0],
      school: querySchool.rows[0],
      student: randomUser.rows[0],
      semesters: agrupadoPorSemestre,
      average: (average / agrupadoPorSemestre.length).toFixed(2),
      autorities: queryAutority.rows,
      year: `${fecha_inicio.split("-")[0]} - ${fecha_fin.split("-")[0]}`,
    };

    res.json({
      status: "success",
      data,
    });
  } catch (error) {
    res.status(500).json({
      status: "failed",
      data: error.message,
    });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Servidor corriendo en http://${HOST}:${PORT}`);
});
