$(document).ready(function () {

    $("#numbersTable").DataTable({

        paging:false,
        info:false,
        ordering:true,
        searching:true,

        language:{
            search:"",
            searchPlaceholder:"Search..."
        }

    });

});