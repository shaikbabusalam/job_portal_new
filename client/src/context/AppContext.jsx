import { createContext, useState, useEffect, useRef } from "react";
import { jobsData } from "../assets/assets";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth, useUser } from "@clerk/clerk-react";

export const AppContext = createContext();

export const AppContextProvider = (props) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const { user, isLoaded: isUserLoaded } = useUser();
    const { getToken, isLoaded: isAuthLoaded, isSignedIn } = useAuth();

    const [searchFilter, setSearchFilter] = useState({
        title: '',
        location: ''
    });

    const [isSearched, setIsSearched] = useState(false);
    const [jobs, setJobs] = useState([]);
    const [showRecruiterLogin, setShowRecruiterLogin] = useState(false);

    // Tab-scoped recruiter token so Applicant and Recruiter tabs never overwrite each other
    const [companyToken, setCompanyToken] = useState(() => sessionStorage.getItem('companyToken') || null);
    const [companyData, setCompanyData] = useState(null);
    const [userData, setUserData] = useState(null);
    const [userApplications, setUserApplications] = useState([]);

    const pauseAppSyncRef = useRef(false);

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

    const fetchCompanyData = async (activeToken) => {
        try {
            const { data } = await axios.get(backendUrl + '/api/company/company', {
                headers: { token: activeToken || companyToken }
            });

            if (data.success && data.company) {
                setCompanyData(data.company);
            } else {
                sessionStorage.removeItem('companyToken');
                setCompanyToken(null);
                setCompanyData(null);
            }
        } catch {
            sessionStorage.removeItem('companyToken');
            setCompanyToken(null);
            setCompanyData(null);
        }
    };

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

    const fetchUserApplications = async (silent = false) => {
        if (silent && pauseAppSyncRef.current) return;
        try {
            const token = await getToken();
            if (!token) return;

            const { data } = await axios.get(backendUrl + '/api/users/applications', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (data.success && !pauseAppSyncRef.current) {
                setUserApplications(data.applications);
            } else if (!silent && !data.success) {
                toast.error(data.message);
            }
        } catch (error) {
            if (!silent) {
                toast.error(error.response?.data?.message || error.message);
            }
        }
    };

    useEffect(() => {
        // Clean up any legacy shared localStorage token
        localStorage.removeItem('companyToken');
        fetchJobs();
    }, []);

    useEffect(() => {
        if (companyToken) {
            sessionStorage.setItem('companyToken', companyToken);
            fetchCompanyData(companyToken);
        } else {
            sessionStorage.removeItem('companyToken');
            setCompanyData(null);
        }
    }, [companyToken]);

    useEffect(() => {
        if (!isUserLoaded || !isAuthLoaded) return;

        if (!isSignedIn || !user) {
            setUserData(null);
            setUserApplications([]);
            return;
        }

        fetchUserData();
        fetchUserApplications(false);

        const handleFocus = () => fetchUserApplications(true);
        window.addEventListener('focus', handleFocus);

        const interval = setInterval(() => {
            fetchUserApplications(true);
        }, 4000);

        return () => {
            window.removeEventListener('focus', handleFocus);
            clearInterval(interval);
        };
    }, [isUserLoaded, isAuthLoaded, isSignedIn, user]);

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
        pauseAppSyncRef,
    };

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    );
};