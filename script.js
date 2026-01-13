/***********************
 * USERS (TEMP LOGIN)
 * (Later ERPNext auth se replace hoga)
 ***********************/
const users = [
    { username: "1111", password: "1111", location: "Modan", role: "operator" },
    { username: "2222", password: "2222", location: "Baldeya", role: "operator" },
    { username: "3333", password: "3333", location: "Al-Khraj", role: "operator" },
    { username: "Admin", password: "12345", location: "all", role: "admin" }
];

let currentUser = null;

/***********************
 * LOCATIONS
 ***********************/
const locations = ["Modan", "Baldeya", "Al-Khraj"];

/***********************
 * PIPE SPEED (sec/m)
 ***********************/
const pipeSpeed = {
    "20": 20,
    "32": 20,
    "33": 20,
    "110": 82,
};

/***********************
 * MACHINE STATE
 ***********************/
let machinesData = {};

/***********************
 * INIT MACHINES
 * 12 machines per location
 ***********************/
locations.forEach((loc, i) => {
    machinesData[loc] = Array.from({ length: 12 }, (_, idx) => ({
        id: i * 1000 + idx + 1,
        name: `Machine ${idx + 1}`,
        status: "free", // free | running | stopped
        job: null,
        timer: null
    }));
});

/***********************
 * LOGIN
 ***********************/
document.getElementById("login-form").addEventListener("submit", e => {
    e.preventDefault();

    const u = username.value.trim();
    const p = password.value.trim();

    const user = users.find(x => x.username === u && x.password === p);
    if (!user) {
        alert("Invalid username or password");
        return;
    }

    currentUser = user;

    document.getElementById("login-section").classList.add("hidden");
    document.getElementById("dashboard-section").classList.remove("hidden");

    showDashboard();
});

/***********************
 * DASHBOARD
 ***********************/
function showDashboard() {
    const container = document.getElementById("locations");
    container.innerHTML = "";

    const visibleLocations =
        currentUser.location === "all"
            ? locations
            : [currentUser.location];

    visibleLocations.forEach(renderLocation);
}

function renderLocation(location) {
    const div = document.createElement("div");
    div.className = "location-card";
    div.innerHTML = `
        <h2>${location}</h2>
        <div class="machines-grid" id="grid-${location}"></div>
    `;
    document.getElementById("locations").appendChild(div);
    renderMachines(location);
}

/***********************
 * RENDER MACHINES
 ***********************/
function renderMachines(location) {
    const grid = document.getElementById(`grid-${location}`);
    grid.innerHTML = "";

    machinesData[location].forEach(machine => {
        const card = document.createElement("div");
        card.className = "machine-card";

        card.innerHTML = `
            <h3>
                ${machine.name}
                ${
                    currentUser.role === "admin"
                        ? `<button style="margin-left:10px"
                            onclick="editMachineName('${location}', ${machine.id})">
                            Edit
                           </button>`
                        : ""
                }
            </h3>

            <p>Status: <b>${machine.status.toUpperCase()}</b></p>

            ${
                machine.job
                ? `
                <div class="job-card">
                    <p><b>JOB CARD</b></p>
                    <p>Work Order: ${machine.job.work_order}</p>
                    <p>Pipe Size: ${machine.job.size} mm</p>
                    <p>Quantity: ${machine.job.completed_qty.toFixed(1)}
                        / ${machine.job.total_qty} m</p>
                    <p>ETA Remaining: ${machine.job.remaining_time}</p>
                </div>
                `
                : `<p>No Job Assigned</p>`
            }

            ${
                currentUser.role === "operator" && machine.job
                ? `
                <div class="controls">
                    <button onclick="startMachine('${location}', ${machine.id})">▶ Start</button>
                    <button onclick="pauseMachine('${location}', ${machine.id})">⏸ Pause</button>
                    <button onclick="stopMachine('${location}', ${machine.id})">⛔ Stop</button>
                </div>
                `
                : ""
            }
        `;
        grid.appendChild(card);
    });
}

/***********************
 * ADMIN: EDIT MACHINE NAME
 ***********************/
function editMachineName(location, id) {
    if (currentUser.role !== "admin") return;

    const machine = machinesData[location].find(m => m.id === id);
    if (!machine) return;

    const newName = prompt("Enter new machine name:", machine.name);
    if (!newName || !newName.trim()) return;

    machine.name = newName.trim();
    renderMachines(location);
}

/***********************
 * MACHINE CONTROLS
 ***********************/
function startMachine(location, id) {
    const machine = machinesData[location].find(m => m.id === id);
    if (!machine || !machine.job || machine.timer) return;

    machine.status = "running";
    machine.timer = setInterval(() => runMachine(location, id), 1000);
    renderMachines(location);
}

function pauseMachine(location, id) {
    const machine = machinesData[location].find(m => m.id === id);
    if (!machine) return;

    clearInterval(machine.timer);
    machine.timer = null;
    machine.status = "stopped";
    renderMachines(location);
}

function stopMachine(location, id) {
    const machine = machinesData[location].find(m => m.id === id);
    if (!machine) return;

    clearInterval(machine.timer);
    machine.timer = null;
    machine.status = "free";
    machine.job = null;
    renderMachines(location);
}

/***********************
 * PRODUCTION SIMULATION
 ***********************/
function runMachine(location, id) {
    const machine = machinesData[location].find(m => m.id === id);
    if (!machine || machine.status !== "running") return;

    const speed = pipeSpeed[machine.job.size];
    machine.job.completed_qty += (1 / speed);

    const remainingQty = machine.job.total_qty - machine.job.completed_qty;
    const remainingSec = remainingQty * speed;

    const h = Math.floor(remainingSec / 3600);
    const m = Math.floor((remainingSec % 3600) / 60);
    machine.job.remaining_time = `${h}h ${m}m`;

    if (machine.job.completed_qty >= machine.job.total_qty) {
        clearInterval(machine.timer);
        machine.timer = null;
        machine.status = "free";
        machine.job = null;
    }

    renderMachines(location);
}

/***********************
 * TEMP AUTO START DEMO
 ***********************/
function demoAssignJob() {
    locations.forEach(loc => {
        const machine = machinesData[loc][0];
        if (!machine.job) {
            const qty = 500;
            const size = "110";
            const speed = pipeSpeed[size];
            const totalSec = qty * speed;

            machine.job = {
                work_order: "WO-DEMO",
                size,
                total_qty: qty,
                completed_qty: 0,
                remaining_time: `${Math.floor(totalSec / 3600)}h ${Math.floor((totalSec % 3600) / 60)}m`
            };
            machine.status = "running";
            machine.timer = setInterval(
                () => runMachine(loc, machine.id),
                1000
            );
        }
    });
}

/* COMMENT THIS OUT WHEN BACKEND CONNECTS */
// demoAssignJob();
