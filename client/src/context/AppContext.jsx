import { createContext, useState, useEffect } from "react";
import { jobsData } from "../assets/assets";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth, useUser } from "@clerk/clerk-react";

export const AppContext = createContext();

export const AppContextProvider = (props) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const { user, isLoaded: isUserLoaded } = useUser();
    const { getToken, isLoaded: isAuthLoaded, isSignedIn } = useAuth();

    // Search Filter State
    const [searchFilter, setSearchFilter] = useState({
        title: '',
        location: ''
    });

    // Search Status
    const [isSearched, setIsSearched] = useState(false);

    // Jobs State
    const [jobs, setJobs] = useState([]);

    // Recruiter Login Popup State
    const [showRecruiterLogin, setShowRecruiterLogin] = useState(false);

    const [companyToken, setCompanyToken] = useState(null);
    const [companyData, setCompanyData] = useState(null);
    const [userData, setUserData] = useState(null);
    const [userApplications, setUserApplications] = useState([]);

    // Fetch Jobs (with fallback to jobsData if backend fails)
    const fetchJobs = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/jobs');
            if (data.success) {
                setJobs(data.jobs);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.warn("Using local assets jobsData due to API error:", error.message);
            setJobs(jobsData);
        }
    };

    // Fetch company data
    const fetchCompanyData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/company/company', {
                headers: { token: companyToken }
            });

            if (data.success) {
                setCompanyData(data.company);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    // Fetch user data
    const fetchUserData = async () => {
        try {
            const token = await getToken();
            if (!token) return;

            const { data } = await axios.get(backendUrl + '/api/users/user', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (data.success) {
                setUserData(data.user);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    // Func to fetch users applied applications data
    const fetchUserApplications = async () => {
        try {
            const token = await getToken();
            if (!token) return;

            const { data } = await axios.get(backendUrl + '/api/users/applications', {
                headers: { Authorization: `Bearer ${token}` } // ✅ Fixed: Added space after Bearer
            });

            if (data.success) {
                setUserApplications(data.applications);
            } else {
                toast.error(data.message);
            }

        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    useEffect(() => {
        fetchJobs();

        const storedCompanyToken = localStorage.getItem('companyToken');
        if (storedCompanyToken) {
            setCompanyToken(storedCompanyToken);
        }
    }, []);

    useEffect(() => {
        if (companyToken) {
            fetchCompanyData();
        }
    }, [companyToken]);

    useEffect(() => {
        if (isUserLoaded && isAuthLoaded && isSignedIn && user) {
            fetchUserData();
            fetchUserApplications();
        }
    }, [isUserLoaded, isAuthLoaded, isSignedIn, user]);

    // Context Values
    const value = {
        searchFilter,
        setSearchFilter,
        isSearched,
        setIsSearched,
        jobs,
        setJobs,
        showRecruiterLogin,
        setShowRecruiterLogin,
        companyToken,
        setCompanyToken,
        companyData,
        setCompanyData,
        userData,
        setUserData,
        userApplications,
        setUserApplications,
        fetchUserData,
        backendUrl,
        fetchJobs,
        fetchUserApplications,
    };

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    );
};