import axios from "axios";
import { useEffect, useState } from "react";


const API_URL = "http://localhost:3000/user";

const TestBackend=()=>{
    const [users, setUsers]=useState([]);

    useEffect(()=>{
        axios.get(API_URL)
        .then((response) => {
            setUsers(response.data);
        })
        .catch((error) => {
            console.error("Error fetching backend data:", error);
            setUsers([]);
        });
    },[])

    return(
        <div className="flex items-center justify-center h-screen">
            <h1 className="text-2xl font-bold">Users: {users.length}</h1>
            <ul className="mt-4">
                {users.map((user) => (
                    <li key={user.id} className="text-lg">{user.name}</li>
                ))}
            </ul>
        </div>
    )

}

export default TestBackend;