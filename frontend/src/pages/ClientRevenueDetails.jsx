import { useEffect, useState } from "react";
import axios from "../utils/axios";
import { useParams } from "react-router-dom";

const API = "/api";

export default function ClientRevenueDetails(){

const { companyId } = useParams();
const token = localStorage.getItem("adminToken");

const [data,setData] = useState(null);

useEffect(()=>{
fetchData();
},[]);

const fetchData = async()=>{

const res = await axios.get(`${API}/admin/revenue/${companyId}`,{
headers:{Authorization:`Bearer ${token}`}
});

setData(res.data);

};

if(!data) return <p className="p-6">Loading...</p>;

return(

<div className="p-8 bg-gray-100 min-h-screen">

{/* COMPANY CARD */}

<div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-600 mb-6">

<h2 className="text-2xl font-bold">{data.companyName}</h2>

<p className="text-gray-500">
Total Employees: {data.totalEmployees}
</p>

<h1 className="text-3xl text-green-600 font-bold mt-2">
₹ {data.totalRevenue}
</h1>

{/* CATEGORY TOTALS */}

<div className="grid grid-cols-2 gap-4 mt-4 bg-gray-100 p-4 rounded">

<p>Address Total: ₹ {data.addressTotal}</p>
<p>Employment Total: ₹ {data.employmentTotal}</p>
<p>Education Total: ₹ {data.educationTotal}</p>
<p>Criminal Total: ₹ {data.criminalTotal}</p>

</div>

</div>


{/* EMPLOYEES */}

<div className="space-y-4">

{data.employees.map(emp=>(

<div key={emp.id} className="bg-white p-4 rounded-xl shadow">

<div className="flex justify-between">

<h3 className="font-bold">{emp.name}</h3>

<p className="text-blue-600 font-bold">
Total: ₹ {emp.total}
</p>

</div>

<div className="grid grid-cols-2 gap-4 mt-3">

<InputBox label="Address" value={emp.address}/>
<InputBox label="Employment" value={emp.employment}/>
<InputBox label="Education" value={emp.education}/>
<InputBox label="Criminal" value={emp.criminal}/>

</div>

</div>

))}

</div>

</div>

);

}


/* ================= SMALL COMPONENT ================= */

function InputBox({label,value}){

return(

<div>

<p className="text-sm text-gray-500">
{label}: ₹ {value}
</p>

<input
value={value}
readOnly
className="w-full border p-2 rounded mt-1"
/>

</div>

);

}