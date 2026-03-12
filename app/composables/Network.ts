export const useNetwork = () => {
    const localIP = ref<string>("");
    const localPort = ref<number>(0);

    const fetchIp = async () => {
        if ((window as any).electronAPI) {
            localIP.value = await (window as any).electronAPI.getLocalIP();
        } else {
            localIP.value = "127.0.0.1";
        }
    };

    const fetchPort = async () => {
        if ((window as any).electronAPI) {
            localPort.value = await (window as any).electronAPI.getLocalPort();
        }

        return "Could not find port";
    };


    return {
        localIP,
        fetchIp,
        fetchPort,
        localPort,
    };
};
